# 部署与运维架构

本文记录当前生产部署的技术基线和恢复边界。日常操作请使用 [部署与运维速查](OPERATIONS_QUICK_REFERENCE.md)，首次部署或重建请按 [Docker + Caddy 部署方案](DOCKER_DEPLOYMENT.md) 执行。

## 当前拓扑

- 一台腾讯云中国香港轻量应用服务器（公网 IPv4 `43.129.242.112`），运行 Ubuntu 24.04。
- 应用以单 Docker 容器 `radio-association` 运行（单 Uvicorn 进程），镜像 tag 为 40 位 commit SHA；compose 项目位于 `/opt/radio-association/docker/src/deployment/docker/`。
- 容器只发布 `127.0.0.1:5000`；Caddy 另提供 `127.0.0.1:8080` 回环预览入口。
- 公网只由 Caddy（systemd 服务）提供 80/443；80 自动跳转 HTTPS；443 另开放 UDP 用于 HTTP/3 (QUIC)。
- 5000 和 8080 不加入腾讯云公网防火墙规则。
- 数据库为单机 SQLite；不要增加 Uvicorn worker、多实例或共享数据库写入者。

## 目录与权限

| 路径 | 用途 | 主要权限 |
| --- | --- | --- |
| `/opt/radio-association/docker/src` | 运维文件克隆（compose、radioctl、备份脚本），checkout 锚定部署 SHA | root 管理，**不用于构建镜像** |
| `/etc/radio-association/app.env` | JWT、负责人账号哈希和私有路径 | `root:radio-association 640` |
| `/etc/caddy/Caddyfile` | 反代与安全配置，由仓库模板生成 | `root:root 644` |
| `/var/lib/radio-association/private/recruitment.json` | 当前招新业务配置 | `radio-association:radio-association 600` |
| `/var/lib/radio-association/data/database.sqlite` | 生产数据库（WAL 模式） | `radio-association:radio-association 640` |
| `/var/lib/radio-association/private/admissions.json` | 私有录取名单 | `radio-association:radio-association 600` |
| `/var/lib/radio-association/state/backup-status.json` | 最近备份状态 | `root:radio-association 640` |
| `/var/backups/radio-association/` | 本机一致性备份 | `root:root 750`，默认保留 14 天 |
| `/var/lib/caddy/` | Caddy 证书与 ACME 账户状态 | caddy 管理，**不得删除** |

真实 `.env`、数据库、Excel、CSV、录取名单、联系人、密码、Token 和私钥均不进入镜像、Git、公开目录或普通日志。

## 精确版本发布

发布源必须是已推送、已通过 CI 的完整 40 位 Git commit SHA。镜像**只在开发机构建**（开发机与服务器同为 linux/amd64，普通 `docker build` 即可），经 `docker save | ssh … docker load` 传输，服务器与开发机双侧核对镜像 ID 后，通过 compose 的 `.env` 锚点 `RADIO_SHA` 切换版本并 `docker compose up -d --no-build`。服务器上不构建镜像、不执行 `git pull` 后直接切换。

回滚 = 把 `RADIO_SHA` 换回旧 tag 后 `up -d --no-build`；旧镜像在服务器本地保留最近 2 个 tag。

## 运维入口与权限模型

- 接交者用公钥登录 `admin`；`admin` 属于 `sudo` 组和 `docker` 组，需要 root 的操作经 `sudo -i` 进行。
- Ubuntu 根账户默认锁定，`su -` 不可用；root 直接 SSH 和 SSH 密码认证保持关闭。
- `radioctl` 已缩减为 `backup` 单个子命令（手动备份与备份 timer 使用）；发布/回滚/恢复/配置更新走 [Docker + Caddy 部署方案](DOCKER_DEPLOYMENT.md) 第 8 节的 Docker 流程。

## 备份与恢复

`radio-association-backup.timer` 每天北京时间 03:00 触发（随机延迟、错过补跑），执行 `/usr/local/sbin/radioctl backup`：通过 SQLite 在线 Backup API 导出，附 `PRAGMA quick_check` 与 SHA-256 伴随文件，本机保留 14 天，结果写入 `backup-status.json`。

`/ops/backupz` 只允许从服务器本机访问，最近一次成功备份超过 30 小时返回 503。容器运行时不得用 `cp` 复制主数据库、WAL 或 SHM 文件代替备份。

恢复必须先 `docker compose stop`（WAL 模式下不能热替换），用 `sqlite_backup.py restore` 离线恢复、修正属主后再 `docker compose start`；完整流程见 [Docker + Caddy 部署方案](DOCKER_DEPLOYMENT.md) 第 8.4 节。

可选的 `OSS_BACKUP_URI` 异地备份（`/etc/radio-association/backup.env`）不是当前上线前提；如未来启用，应使用私有 Bucket、服务端加密、受限凭据和明确生命周期策略。

## Caddy、HTTPS 与日志

公网 HTTPS 由 Caddy 自动签发和续期 Let's Encrypt 证书，无 certbot、无续期钩子。公网配置（模板在 `deployment/caddy/Caddyfile.template`）：

- 80 只用于跳转 HTTPS 和 ACME 挑战（Caddy 内部处理）；
- 443 反向代理到 `127.0.0.1:5000`，开启 zstd/gzip 压缩；
- 阻止公网访问 `/ops/` 和隐藏文件；
- 3MB 请求体上限与基础安全响应头；
- 图片/CSS/JS 静态资源携带 `Cache-Control: max-age=86400`，HTML 不缓存；
- 访问日志写入 `/var/log/caddy/radio-association.access.log`（console 格式，自动滚动），不记录查询字符串之外的敏感头。

应用日志经 `docker logs radio-association` 查看（json-file，10 MB × 3 滚动）。Caddy 运行日志经 `journalctl -u caddy` 查看。

## 验收基线

- 容器 `radio-association` 为 `healthy`，`caddy` 与 `docker` 服务为 `active`；
- `127.0.0.1:5000` 和 `127.0.0.1:8080` 只监听回环，公网只开放 22、80、443；
- HTTPS 下首页、申请页、录取查询页和负责人登录正常，HTTP 跳转 HTTPS；
- 公网 `/ops/` 返回 404，内部 `/healthz` 与 `/ops/backupz` 正常；
- 当前部署 SHA（compose `.env` 的 `RADIO_SHA`）与最近备份状态可查询；
- 入会申请和录取查询在未填写真实业务信息前保持关闭；
- 校园网或普通网络与手机流量均能访问。

文档中的快照不能代替实时状态。每次发布、交接或故障恢复都重新执行只读检查，并记录当次目标 SHA、备份和验证结果。
