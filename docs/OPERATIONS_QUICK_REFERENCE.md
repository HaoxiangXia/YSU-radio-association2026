# 预生产运维速查

## 1. 执行前

- 腾讯云轻量应用服务器控制台救援可用；
- 已创建服务器快照；
- 本机 SSH 公钥已导入，并已用新连接验证；
- 当前提交已通过 GitHub Actions；
- 安全组和防火墙仍只保留必要 SSH，未开放 80、443、5000。

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
