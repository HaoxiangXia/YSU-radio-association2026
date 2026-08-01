# 部署与运维速查

## 1. 执行前

- 腾讯云轻量应用服务器控制台救援可用；
- 已创建服务器快照；
- 本机 SSH 公钥已导入，并已用新连接验证；
- 当前提交已通过 GitHub Actions；
- 腾讯云防火墙只开放当前阶段所需端口；永不开放 5000、8080。

在 PowerShell 中设置本次参数：

```powershell
$Server = "服务器公网 IP"
$User = "root"
$Key = "C:\Users\你的用户名\.ssh\id_ed25519"
$Commit = git rev-parse HEAD
```

## 2. 只读盘点与首次准备

```powershell
.\scripts\radio-remote.ps1 -Action Inventory -Server $Server -User $User -IdentityFile $Key
.\scripts\radio-remote.ps1 -Action Bootstrap -Server $Server -User $User -IdentityFile $Key -Commit $Commit
```

发现未知服务、目录、端口冲突或 SSH 生效配置异常时停止，不覆盖。

在服务器交互终端创建真实环境文件，密钥和密码哈希不要放入命令参数：

```bash
sudo install -o root -g root -m 600 /etc/radio-association/app.env.example /etc/radio-association/app.env
sudoedit /etc/radio-association/app.env
```

`JWT_SECRET` 至少 32 字符；密码哈希在可信本地交互生成。申请和录取查询继续保持关闭。

## 3. 发布、配置与验证

```powershell
.\scripts\radio-remote.ps1 -Action Deploy -Server $Server -User $User -IdentityFile $Key -Commit $Commit
.\scripts\radio-remote.ps1 -Action Status -Server $Server -User $User -IdentityFile $Key
.\scripts\radio-remote.ps1 -Action Tunnel -Server $Server -User $User -IdentityFile $Key
```

保持隧道窗口运行，在浏览器访问 `http://127.0.0.1:8080`。不要访问公网 `:5000`。

日常招新请登录“招新负责人入口”，在“招新设置与录取结果”页面完成配置和录取名单发布。只有网页不可用时才使用以下备用命令：

```powershell
.\scripts\radio-remote.ps1 -Action Configure -Server $Server -User $User -IdentityFile $Key -File .\config\recruitment.local.json
.\scripts\radio-remote.ps1 -Action Admissions -Server $Server -User $User -IdentityFile $Key -File "C:\私有目录\admission-results.json"
```

## 4. 备份、回滚与恢复

```powershell
.\scripts\radio-remote.ps1 -Action Backup -Server $Server -User $User -IdentityFile $Key
.\scripts\radio-remote.ps1 -Action Rollback -Server $Server -User $User -IdentityFile $Key
```

指定版本回滚时追加 `-Commit <40位SHA>`。数据库恢复会停止服务并要求输入 `RESTORE`：

```powershell
.\scripts\radio-remote.ps1 -Action Restore -Server $Server -User $User -IdentityFile $Key -BackupPath "/var/backups/radio-association/database-时间-reason.sqlite"
```

故障诊断：

```bash
sudo radioctl status
sudo journalctl -u radio-association -n 100 --no-pager
sudo systemctl list-timers radio-association-backup.timer
```

不要执行旧 `scripts/deploy.sh`、运行目录 `git pull/reset`、直接 `cp` 活跃数据库或 `scripts/init-db.js`。

## 5. 首次启用公网 HTTPS

公网开放分两步，避免在域名尚未生效时直接暴露应用：

```powershell
$Domain = "wuxie.luciangray.net"
.\scripts\radio-remote.ps1 -Action PublicPrepare -Server $Server -User $User -IdentityFile $Key -Domain $Domain
```

`PublicPrepare` 只在 80 端口提供 ACME 验证路径和 503 准备页，申请后台及业务页面仍不对公网开放。随后将域名唯一的 A 记录指向服务器公网 IPv4，并在腾讯云防火墙开放 TCP 443。确认公网 DNS 已生效后执行：

```powershell
.\scripts\radio-remote.ps1 -Action PublicEnable -Server $Server -User $User -IdentityFile $Key -Domain $Domain
.\scripts\radio-remote.ps1 -Action PublicStatus -Server $Server -User $User -IdentityFile $Key -Domain $Domain
```

`PublicEnable` 使用 HTTP-01 签发 Let's Encrypt 证书，启用 HTTPS 和 HTTP 跳转，并启用证书自动续期 timer。它不会修改招新业务开关。申请与录取查询必须保持关闭，直到负责人填写真实配置并明确确认正式开放。

常规公网验收至少包括：

- `http://域名` 跳转到同域名 HTTPS；
- 证书域名、证书链和有效期正确；
- 首页、入会申请关闭页、录取查询关闭页和负责人登录正常；
- `/ops/`、公网 5000 和公网 8080 不可访问；
- `sudo certbot renew --dry-run` 成功；
- 校园网、校外网络和手机流量至少各验证一次。
