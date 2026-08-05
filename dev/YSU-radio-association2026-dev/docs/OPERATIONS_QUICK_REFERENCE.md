# 部署与运维速查

本文面向已经取得服务器 `admin` 公钥和 root 密码的接交者。日常招新优先使用网页后台；只有状态检查、备份、发布、回滚、恢复或故障排查才需要 SSH。

## 1. 登录与权限

在 Windows PowerShell 中：

```powershell
$Server = "43.129.242.112"
$Key = "$HOME\.ssh\id_ed25519"
ssh -i $Key "admin@$Server"
```

登录后进入 root shell：

```bash
su -
id
```

输入私下交付的 root 密码；`id` 应显示 `uid=0(root)`。root 禁止直接 SSH 登录，SSH 密码认证也保持关闭。不要把 root 密码写入脚本、命令参数、Git、聊天、截图或本文。

当前 `admin` 不具备非交互 sudo。仓库中的 `scripts/radio-remote.ps1` 使用 `BatchMode` 和 `sudo`，不能直接以这个 `admin` 权限模型执行需要 root 的动作。

## 2. 日常只读检查

以下命令都在 root shell 中执行：

```bash
radioctl status
systemctl is-active radio-association nginx
systemctl list-timers radio-association-backup.timer certbot.timer
certbot certificates
ss -ltnp
```

期望结果：

- `radio-association` 和 `nginx` 均为 `active`；
- `/healthz` 与备份状态正常，最近成功备份未超过 30 小时；
- 两个 timer 都有下一次执行时间；
- 公网只监听 22、80、443，5000 和 8080 只监听 `127.0.0.1`；
- `https://wuxie.luciangray.net` 可访问，HTTP 自动跳转 HTTPS。

查看最近应用日志：

```bash
journalctl -u radio-association -n 100 --no-pager
```

日志、截图和求助信息不得包含密码、Token、完整手机号、邮箱、表单正文或录取名单。

## 3. 备份、回滚与恢复

手动创建一致性数据库备份：

```bash
radioctl backup
radioctl status
ls -lh /var/backups/radio-association/
```

回滚到 `previous`：

```bash
radioctl rollback
radioctl status
```

指定版本时使用完整 40 位 SHA：

```bash
radioctl rollback <40位SHA>
radioctl status
```

数据库恢复属于高影响操作。先停止网页写操作、创建当前备份并让 Codex 核对目标文件、校验和及记录范围，再执行：

```bash
radioctl backup
radioctl restore /var/backups/radio-association/<准确文件名>.sqlite --confirm
radioctl status
```

不要猜测备份文件，不要复制活跃 SQLite/WAL 文件，不要删除数据库来“重置”。

## 4. 发布代码更新

代码更新前必须满足：

- 当前分支为 `dev`，工作区没有不明修改；
- 目标提交已推送到 `origin/dev` 并通过 GitHub Actions；
- 使用经过确认的完整 40 位 SHA；
- 申请和录取查询保持关闭，当前数据库备份正常。

让 Codex 完成代码检查、测试、源码归档、SHA-256 计算和上传，并给出三个精确值：临时归档路径、40 位提交 SHA、归档 SHA-256。接交者只在 root shell 中执行：

```bash
radioctl deploy /tmp/<归档文件名> <40位SHA> <SHA-256>
radioctl status
```

确认健康后，才删除 Codex 明确给出的单个 `/tmp/` 归档。`radioctl deploy` 会先备份数据库、安装锁定依赖、原子切换版本和检查健康；失败会自动恢复原版本。

不要在 `/opt/radio-association/current` 中直接修改文件，不要在服务器运行目录执行 `git pull`、`git reset`、`checkout` 或旧 `scripts/deploy.sh`。

## 5. 网页故障时更新业务文件

日常业务配置和正式录取名单都应通过网页后台处理。只有网页功能确实不可用时，才让 Codex 校验文件并上传到 `/tmp/`，然后在 root shell 执行：

```bash
radioctl configure /tmp/<已校验的招新配置.json>
radioctl admissions /tmp/<已校验的录取名单.json>
radioctl status
```

操作成功后删除对应的单个临时文件。不要上传原始 Excel 到服务器，不要在申请或录取查询开放时替换业务文件。

## 6. HTTPS 与公网检查

常规检查：

```bash
nginx -t
systemctl status nginx certbot.timer --no-pager
certbot certificates
curl -I https://wuxie.luciangray.net/
```

首次启用公网的 `PublicPrepare`、`PublicEnable` 已经完成，日常不得重复运行。只有服务器重建、域名变化或证书体系需要重建时，才参考 [部署与运维架构](DEPLOYMENT_AND_OPERATIONS.md)，让 Codex 重新盘点后制定当次命令。

云服务器不可达、公网 IP 变化、腾讯云防火墙或域名解析故障仍需要资产所有者使用腾讯云或阿里云控制台处理。

## 7. 禁止操作

- 不运行生产 `scripts/init-db.js` 或旧 `scripts/deploy.sh`；
- 不直接复制活跃 SQLite、WAL、SHM 文件作为备份；
- 不向公网开放 5000 或 8080；
- 不公开 `.env`、数据库、Excel、CSV、录取 JSON、密码、Token 或私钥；
- 不在目标路径、备份和恢复方案不明确时批量删除、恢复或覆盖文件。
