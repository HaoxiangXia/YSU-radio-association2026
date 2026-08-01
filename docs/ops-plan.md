# `radio-association` 预生产部署与运维方案

> 本文是当前部署基线。旧的公网 `:5000`、运行目录 `git pull/reset` 和直接复制 SQLite 文件方案已经停用。

## 当前边界

- 今天只建立预生产环境，不开放公网 80、443、5000。
- Uvicorn 只监听 `127.0.0.1:5000`，Nginx 预演入口只监听 `127.0.0.1:8080`。
- 验证通过 SSH 隧道完成；备案、域名和 HTTPS 就绪后再设计公网入口。
- 入会申请和录取查询使用安全默认配置，保持关闭。
- SSH 密码认证的关闭是独立高风险步骤，必须在密钥新连接、控制台救援和快照均确认后另行执行。

## 目录与权限

| 路径 | 用途 | 主要权限 |
| --- | --- | --- |
| `/opt/radio-association/releases/<SHA>` | 不可变代码发布目录 | `root:radio-association`，服务只读 |
| `/opt/radio-association/current` | 当前发布的原子符号链接 | root 管理 |
| `/opt/radio-association/previous` | 上一健康发布 | root 管理 |
| `/etc/radio-association/app.env` | 密钥、账号及私有路径 | `root:root 600` |
| `/var/lib/radio-association/private/recruitment.json` | 当前招新业务配置 | `radio-association:radio-association 600`，供负责人网页原子更新 |
| `/var/lib/radio-association/data/database.sqlite` | 生产数据库 | `radio-association 640` |
| `/var/lib/radio-association/private/admissions.json` | 私有录取名单 | `radio-association:radio-association 600`，不进入静态目录 |
| `/var/backups/radio-association/` | 本机一致性备份 | root 管理，保留 14 天 |

应用使用无登录 shell、无 sudo 权限的 `radio-association` 系统用户运行。systemd 启用了只读系统、最小地址族、空 capability 等限制。

## 首次准备

1. 用户先在腾讯云轻量应用服务器控制台确认远程连接或救援能力并创建修改前快照。
2. 将本机 SSH 公钥导入服务器，建立一条新的密钥连接。
3. 运行只读盘点，确认没有未知业务或 80、443、5000 端口冲突。
4. 提交并通过 CI 后，以明确的 40 位 commit SHA 运行 `Bootstrap`。
5. 在服务器根据 `/etc/radio-association/app.env.example` 创建 `app.env`；真实密钥和账号不得出现在聊天、Git 或命令参数中。
6. 运行 `Deploy`，再用 SSH 隧道访问本机 `http://127.0.0.1:8080`。

完整可复制命令见 [OPERATIONS_QUICK_REFERENCE.md](OPERATIONS_QUICK_REFERENCE.md)。

## 发布与自动回滚

Windows 入口使用 `git archive <SHA>` 生成不含 Git 历史的源码归档，计算 SHA-256 后上传。服务器端 `radioctl deploy`：

1. 校验 commit SHA、归档校验和、必需文件和运行配置；
2. 在新的 staging 目录解压，拒绝归档内的符号链接；
3. 执行 `uv sync --frozen --no-dev`；
4. 使用新版本代码校验招新配置；
5. 使用 SQLite Backup API 创建部署前备份；
6. 原子切换 `current`，重启服务并检查 `/healthz`；
7. 健康检查失败时自动切回原版本。

服务器运行目录没有 Git 仓库，也不会执行 `pull`、`checkout` 或 `reset`。发布目录不会被自动批量清理，避免误删仍需保留的回滚版本。

## 统一运维入口

`radioctl deploy/rollback/backup/restore/configure/admissions` 共用 `flock -n` 非阻塞排他锁，避免发布、恢复和配置更新互相踩踏。

- `configure`：先用当前版本 Pydantic 模型校验，再备份旧文件、原子替换、重启和健康检查；失败恢复旧配置。
- `admissions`：先校验全部字段与重复学号，再原子替换；文件始终位于私有目录。
- `restore`：必须显式传入 `--confirm`；校验 SHA-256 和 `PRAGMA quick_check`，停止服务，使用 Backup API 生成恢复前安全备份并恢复，最后重新健康检查。
- `rollback`：切换到指定 SHA 或 `previous`，执行数据库备份和健康检查；失败自动切回。

日常招新不要求接交人员运行上述命令。负责人网页可编辑严格白名单内的招新业务字段，并通过“下载模板 → 上传校验 → 脱敏预览 → 确认发布”更新录取名单。网页不能修改密钥、账号、路径或备份设置；命令入口作为网页故障时的备用方案保留。

## 备份

systemd timer 每天北京时间 03:00 触发，带随机延迟和错过补跑。备份工具使用 Python `sqlite3.Connection.backup()`，随后执行：

- `PRAGMA quick_check`；
- SHA-256 伴随文件；
- 本机 14 天清理；
- 成功状态写入 `/var/lib/radio-association/state/backup-status.json`。

`/ops/backupz` 在最近一次成功备份超过 30 小时后返回 503。配置 `OSS_BACKUP_URI` 时，`radioctl` 还会通过 `ossutil` 上传并验证对象；OSS Bucket 必须为私有、开启服务端加密，并使用生命周期规则保留 90 天。凭据只通过服务器本地受限配置提供。

## 验收

- `systemctl is-active radio-association nginx` 均成功；
- `ss -ltnp` 仅显示 `127.0.0.1:5000` 与 `127.0.0.1:8080`；
- `/livez`、`/healthz`、`/ops/backupz` 返回预期状态；
- SSH 隧道下首页、申请关闭、负责人鉴权、CSV、录取查询关闭均符合配置；
- 手动备份、临时恢复演练和代码回滚均有成功证据；
- 腾讯云防火墙与服务器防火墙未开放公网 Web 端口。

服务器尚未实际执行前，以上仅代表工具与目标设计，不代表部署、备份或回滚已经在生产主机验证。
