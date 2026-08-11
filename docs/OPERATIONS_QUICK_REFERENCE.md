# 部署与运维速查

本文面向已经取得服务器 `admin` 公钥登录权限的接交者。日常招新优先使用网页后台；只有状态检查、备份、发布、回滚、恢复或故障排查才需要 SSH。完整部署流程见 [Docker + Caddy 部署方案](DOCKER_DEPLOYMENT.md)。

## 1. 登录与权限

在 Windows PowerShell 中：

```powershell
$Server = "43.129.242.112"
$Key = "$HOME\.ssh\id_ed25519"
ssh -i $Key "admin@$Server"
```

`admin` 属于 `sudo` 组和 `docker` 组。需要 root 的操作进入 root shell：

```bash
sudo -i
id    # 应显示 uid=0(root)
```

Ubuntu 根账户默认锁定，`su -` 不可用。root 禁止直接 SSH 登录，SSH 密码认证保持关闭。只读检查（`docker ps`、`docker logs`、`curl`）用 `admin` 身份即可执行；修改文件、重启服务才进 root shell。

## 2. 日常只读检查

```bash
docker ps --filter name=radio-association     # STATUS 应为 healthy
docker logs radio-association --tail 100
curl -s http://127.0.0.1:5000/healthz && echo
curl -s http://127.0.0.1:5000/ops/backupz && echo
cat /opt/radio-association/docker/src/deployment/docker/.env   # 当前部署 SHA（RADIO_SHA）
systemctl is-active caddy docker
systemctl list-timers radio-association-backup.timer
ss -ltnp
curl -fsSI https://wuxie.luciangray.net/ | head -3
```

期望结果：

- 容器 `healthy`，`caddy` 与 `docker` 均为 `active`；
- `/healthz` 与备份状态正常，最近成功备份未超过 30 小时；
- 备份 timer 有下一次执行时间；
- 公网只监听 22、80、443，5000 和 8080 只监听 `127.0.0.1`；
- `https://wuxie.luciangray.net` 可访问，HTTP 自动跳转 HTTPS。

日志、截图和求助信息不得包含密码、Token、完整手机号、邮箱、表单正文或录取名单。

## 3. 备份、回滚与恢复

手动创建一致性数据库备份（root shell）：

```bash
radioctl backup
ls -lh /var/backups/radio-association/
curl -s http://127.0.0.1:5000/ops/backupz
```

回滚到上一个镜像版本（root shell）：

```bash
cd /opt/radio-association/docker/src/deployment/docker
radioctl backup
sed -i 's/^RADIO_SHA=.*/RADIO_SHA=<旧SHA>/' .env
docker compose up -d --no-build
sleep 5 && curl --fail http://127.0.0.1:5000/healthz
```

数据库恢复属于高影响操作，**必须先停容器**（WAL 模式下不能热替换）。先停止网页写操作、创建当前备份并让 Codex 核对目标文件与校验和，再按 [Docker + Caddy 部署方案](DOCKER_DEPLOYMENT.md) 第 8.4 节执行（`radioctl` 已无 restore 子命令）。

不要猜测备份文件，不要复制活跃 SQLite/WAL 文件，不要删除数据库来"重置"。

## 4. 发布代码更新

代码更新前必须满足：

- 当前分支为 `dev`，工作区没有不明修改；
- 目标提交已推送到 `origin/dev` 并通过 GitHub Actions；
- 使用经过确认的完整 40 位 SHA；
- 申请和录取查询保持关闭，当前数据库备份正常。

镜像**只在开发机构建**，服务器不构建。开发机侧在仓库根目录执行 `scripts/release-image.sh`：校验目标 SHA 与 HEAD 一致、工作区干净且已推送，然后构建镜像、`docker save | ssh … docker load` 传输并双侧核对镜像 ID。接交者在服务器 root shell 执行：

```bash
docker image inspect --format '{{.Id}}' radio-association:<新SHA>   # 与开发机核对一致
radioctl backup
cd /opt/radio-association/docker/src
git fetch origin && git checkout <新SHA>
[[ "$(git rev-parse HEAD)" == "<新SHA>" ]] || exit 1
cd deployment/docker
sed -i 's/^RADIO_SHA=.*/RADIO_SHA=<新SHA>/' .env
docker compose up -d --no-build
sleep 5 && curl --fail http://127.0.0.1:5000/healthz    # 失败按第 3 节回滚
```

不要修改 `/opt/radio-association/docker/src` 中的文件来"修 bug"——它只提供运维文件，代码变更必须走开发机构建新镜像。

## 5. 网页故障时更新业务文件

日常业务配置和正式录取名单都应通过网页后台处理。只有网页功能确实不可用时，才按 [Docker + Caddy 部署方案](DOCKER_DEPLOYMENT.md) 第 8.5 节的应急路径操作（容器内校验 → 原子替换 → 重启容器）。`radioctl configure` 和 `radioctl admissions` 已废弃。

不要上传原始 Excel 到服务器，不要在申请或录取查询开放时替换业务文件。

## 6. HTTPS 与公网检查

```bash
systemctl status caddy --no-pager
journalctl -u caddy -n 50 --no-pager
runuser -u caddy -- caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
curl -fsSI https://wuxie.luciangray.net/ | head -3
```

证书由 Caddy 自动签发和续期，日常无需干预。**不要删除 `/var/lib/caddy/`**（内含 ACME 账户与证书）。不要以 root 身份直接运行 `caddy validate` 后直接启动服务——它会以 root 属主创建 `/var/log/caddy/*.log` 导致服务无法写日志；用上面的 `runuser` 形式，或删掉该日志文件再启动。

云服务器不可达、公网 IP 变化、腾讯云防火墙或域名解析故障仍需要资产所有者使用腾讯云或阿里云控制台处理。

## 7. 禁止操作

- 不在生产重复运行 `scripts/init-db.js`（破坏性重建静态表）；
- 不在服务器上构建 Docker 镜像（构建只在开发机进行）；
- 不尝试 `radioctl deploy/rollback/restore/configure/admissions`（这些子命令已随旧发布模型移除）；
- 不直接复制活跃 SQLite、WAL、SHM 文件作为备份；
- 不向公网开放 5000 或 8080；
- 不删除 `/var/lib/caddy/`；
- 不公开 `.env`、数据库、Excel、CSV、录取 JSON、密码、Token 或私钥；
- 不在目标路径、备份和恢复方案不明确时批量删除、恢复或覆盖文件。
