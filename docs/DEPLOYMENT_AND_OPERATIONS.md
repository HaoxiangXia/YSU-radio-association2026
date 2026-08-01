# 部署与运维架构

本文记录当前生产部署的技术基线和恢复边界。日常操作请使用 [部署与运维速查](OPERATIONS_QUICK_REFERENCE.md)，接交流程请从 [项目交接与接手指南](HANDOVER_GUIDE.md) 开始。

## 当前拓扑

- 一台腾讯云中国香港轻量应用服务器，运行 Ubuntu 24.04。
- 一个 `radio-association.service`，以无登录、无 sudo 的 `radio-association` 系统用户运行一个 Uvicorn 进程。
- Uvicorn 只监听 `127.0.0.1:5000`；Nginx 的本机预览入口只监听 `127.0.0.1:8080`。
- 公网只由 Nginx 提供 80/443；80 跳转 HTTPS 并保留 ACME HTTP-01 路径。
- 5000 和 8080 不加入腾讯云公网防火墙规则。
- 数据库为单机 SQLite；不要增加 Uvicorn worker、多实例或共享数据库写入者。

## 目录与权限

| 路径 | 用途 | 主要权限 |
| --- | --- | --- |
| `/opt/radio-association/releases/<SHA>` | 不可变代码发布目录 | `root:radio-association`，服务只读 |
| `/opt/radio-association/current` | 当前发布的原子符号链接 | root 管理 |
| `/opt/radio-association/previous` | 上一健康发布 | root 管理 |
| `/etc/radio-association/app.env` | JWT、负责人账号哈希和私有路径 | `root:root 600` |
| `/var/lib/radio-association/private/recruitment.json` | 当前招新业务配置 | `radio-association:radio-association 600` |
| `/var/lib/radio-association/data/database.sqlite` | 生产数据库 | `radio-association:radio-association 640` |
| `/var/lib/radio-association/private/admissions.json` | 私有录取名单 | `radio-association:radio-association 600` |
| `/var/lib/radio-association/state/backup-status.json` | 最近备份状态 | 应用状态目录 |
| `/var/backups/radio-association/` | 本机一致性备份 | `root:root 750`，默认保留 14 天 |

真实 `.env`、数据库、Excel、CSV、录取名单、联系人、密码、Token 和私钥均不进入发布归档、Git、公开目录或普通日志。

## 精确版本发布

发布源必须是已推送、已通过 CI 的完整 40 位 Git commit SHA。源码使用 `git archive <SHA>` 生成归档并计算 SHA-256，服务器不保存工作 Git 仓库，也不执行 `pull`、`checkout` 或 `reset`。

`radioctl deploy <archive> <SHA> <SHA-256>` 会：

1. 校验 SHA、归档校验和、必需文件和归档内路径；
2. 在新的 staging 目录解压，并拒绝归档内符号链接；
3. 执行 `uv sync --frozen --no-dev --python 3.11`；
4. 使用新版本代码校验招新配置；
5. 通过 SQLite Backup API 创建部署前备份；
6. 原子切换 `current`，重启服务并检查 `/healthz`；
7. 健康检查失败时自动切回原版本。

发布目录不会自动批量清理，避免误删仍需回滚的版本。删除旧发布前必须明确目标 SHA、当前和上一版本以及恢复方案。

## 运维入口与并发保护

`radioctl deploy/rollback/backup/restore/configure/admissions` 共用非阻塞排他锁，防止发布、恢复和配置更新互相覆盖。

- `configure`：用当前版本 Pydantic 模型校验，备份旧文件，原子替换、重启和健康检查；失败恢复旧配置。
- `admissions`：校验全部字段与重复学号后原子替换；录取文件始终位于私有目录。
- `restore`：要求明确的备份文件和 `--confirm`，校验 SHA-256 与 `PRAGMA quick_check`，生成恢复前安全备份后恢复。
- `rollback`：切换到指定 SHA 或 `previous`，先备份数据库并检查健康，失败自动切回。

当前交接权限模型是：接交者用公钥登录 `admin`，再使用私下交付的 root 密码执行 `su -`。root 直接 SSH 和 SSH 密码认证保持关闭。`scripts/radio-remote.ps1` 依赖目标账号的非交互 sudo，因此不能直接以当前 `admin` 模型执行需要 root 的动作；接交者的低频发布由 Codex 准备归档、校验和与上传，接交者在 root shell 执行最终 `radioctl` 命令。

## 备份与恢复

`radio-association-backup.timer` 每天北京时间 03:00 触发，带随机延迟和错过补跑。备份工具使用 `sqlite3.Connection.backup()`，然后执行：

- `PRAGMA quick_check`；
- SHA-256 伴随文件；
- 本机 14 天清理；
- 将结果写入 `/var/lib/radio-association/state/backup-status.json`。

`/ops/backupz` 只允许从服务器本机访问，最近一次成功备份超过 30 小时会返回 503。生产服务运行时不得用 `cp` 复制主数据库、WAL 或 SHM 文件代替备份。

可选的 `OSS_BACKUP_URI` 异地备份不是当前短期社团网站的上线前提；如未来启用，应使用私有 Bucket、服务端加密、受限凭据和明确生命周期策略。

## Nginx、HTTPS 与日志

公网 HTTPS 已启用，证书由 `certbot.timer` 自动续期，成功续期后先检查 Nginx 配置再 reload。公网配置：

- 80 只用于 ACME 和跳转 HTTPS；
- 443 反向代理到 `127.0.0.1:5000`；
- 阻止公网访问 `/ops/`；
- 设置上传大小、超时和基础安全响应头；
- 访问日志不记录查询字符串，并只传递 Nginx 实际看到的客户端地址。

仓库仍保留 `PublicPrepare`、`PublicEnable` 和 Nginx 模板，用于服务器重建、域名变化或证书体系重建。健康生产环境不得重复执行首次公网启用流程；先只读盘点，再由 Codex 生成当次恢复方案。

## 验收基线

- `radio-association` 与 `nginx` 均为 `active`；
- `127.0.0.1:5000` 和 `127.0.0.1:8080` 只监听回环，公网只开放 22、80、443；
- HTTPS 下首页、申请页、录取查询页和负责人登录正常，HTTP 跳转 HTTPS；
- 公网 `/ops/` 返回 404，内部 `/healthz` 与 `/ops/backupz` 正常；
- 当前部署 SHA、上一回滚 SHA、最近备份和证书 timer 可查询；
- 入会申请和录取查询在未填写真实业务信息前保持关闭；
- 校园网或普通网络与手机流量均能访问。

文档中的快照不能代替实时状态。每次发布、交接或故障恢复都重新执行只读检查，并记录当次目标 SHA、备份和验证结果。
