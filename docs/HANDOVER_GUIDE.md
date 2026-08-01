# 项目交接与接手指南

本文是后续接交者的统一入口。接交者不需要理解 FastAPI、SQLite、Nginx 或部署脚本内部实现，只需按本文和链接的操作说明执行。

## 1. 先记住这四件事

1. 网站地址：<https://wuxie.luciangray.net>。
2. 日常招新通过网页后台完成，不需要登录服务器。
3. 服务器维护统一使用 `radioctl` 或仓库中的 `scripts/radio-remote.ps1`，不要在服务器运行目录中执行 `git pull`、`git reset` 或旧 `scripts/deploy.sh`。
4. 任何误删、数据异常或恢复操作都先停止继续操作、保留现场，再检查备份；不要删除数据库“重置”。

相关文档：

- [招新日常运行说明](RECRUITMENT_OPERATIONS.md)：开放申请、处理资料、发布录取结果和结束招新；
- [部署与运维速查](OPERATIONS_QUICK_REFERENCE.md)：状态、备份、发布、回滚和恢复命令；
- [个人信息保护上线确认表](PRIVACY_IMPACT_CHECKLIST.md)：正式开放前必须由负责人确认的业务事项；
- [数据库说明](DATABASE.md)：仅在需要理解数据结构或排查复杂故障时阅读。

## 2. 当前已经交付的状态

截至 2026-08-01：

- 生产版本：`a27a5b3903a4e3ef75cd6b5e4e2be105c21ebbd5`；
- Git 开发主线：`dev`，跟踪 `origin/dev`；
- 服务器：腾讯云中国香港，公网 IPv4 `43.129.242.112`；
- 域名：`wuxie.luciangray.net`，A 记录指向上述服务器；
- HTTPS：Let's Encrypt 证书已启用，HTTP 自动跳转 HTTPS，证书由 `certbot.timer` 自动续期；
- 应用：`radio-association.service`、`nginx.service` 和自动备份 timer 正常；
- 公网只提供 80/443，应用端口 5000 和预览端口 8080 不对公网开放；
- 入会申请关闭、录取查询关闭；
- 当前入会申请为 0 条，录取名单未发布；
- 申请、后台、Excel 录取发布、备份、恢复、回滚、HTTPS 和多网络访问均已完成测试。

正式交接当天应重新执行本文第 5 节，不要只依赖这份历史状态。

## 3. 权限和资产边界

### 接交者获得

- GitHub 仓库的项目协作权限；
- 招新负责人网页账号；
- 服务器 `admin` 账号的 SSH 公钥登录；
- 服务器操作系统和应用的完整管理权限；
- 私下交付的应急 root 密码。

### 原资产所有者保留

- 腾讯云账号和轻量服务器控制台；
- 阿里云账号和域名控制台；
- 服务器与域名的付费、续费和资产所有权。

正常招新、发布、备份、重启和故障排查不需要云控制台。以下情况仍只能由资产所有者处理：服务器续费或重装、云平台网络/防火墙异常、服务器公网 IP 变化、域名解析修改。当前接受这一短期边界，不把原资产所有者作为日常维护者。

## 4. 首次取得服务器权限

### 4.1 接交者生成自己的 SSH 密钥

在接交者自己的 Windows PowerShell 中执行：

```powershell
ssh-keygen -t ed25519 -a 100 -C "radio-association-admin"
Get-Content "$HOME\.ssh\id_ed25519.pub"
```

只把以 `ssh-ed25519` 开头的公钥交给当前维护者。私钥文件 `id_ed25519` 只保存在接交者自己的电脑，不发送给任何人。

### 4.2 当前维护者完成一次性安装

当前维护者或 Codex 将公钥加入服务器 `admin` 账号，并把 `admin` 配置为可供运维脚本使用的完整 sudo 管理账号。完成后，由接交者亲自在自己的电脑建立新连接验证。

### 4.3 接交者验证登录

```powershell
ssh -i "$HOME\.ssh\id_ed25519" admin@43.129.242.112
```

登录后执行：

```bash
id
sudo -n true
sudo radioctl status
```

预期结果：

- `id` 显示当前用户为 `admin`，并包含 `sudo` 组；
- `sudo -n true` 无输出且返回成功；
- `radioctl status` 显示应用健康、当前发布 SHA、数据库和备份状态。

root 禁止直接 SSH 登录，SSH 密码认证也保持关闭。应急 root 密码只通过私下渠道交付，不写进 Git、聊天记录或本文；不要为了方便而开启 root SSH 或密码 SSH。

## 5. 接手当天的 15 分钟验收

接交者独立完成以下操作，当前维护者只观察，不代替操作：

1. 用自己的 SSH 私钥登录 `admin`。
2. 执行 `sudo -n true` 和 `sudo radioctl status`。
3. 打开 <https://wuxie.luciangray.net>，确认首页和 HTTPS 正常。
4. 打开网站页脚“招新负责人入口”，用交接到的新账号登录。
5. 进入“入会申请管理”，确认当前记录数量符合预期。
6. 进入“招新设置与录取结果”，确认入会申请和录取查询均保持关闭。
7. 下载一次录取 Excel 模板，但不要发布真实名单。
8. 执行一次手动备份：

```bash
sudo radioctl backup
sudo radioctl status
```

9. 在校园网或普通网络和手机流量各打开一次首页。
10. 按 [交接验收清单](HANDOVER_CHECKLIST.md) 逐项确认。

全部成功后，接交者已经具备独立完成招新和服务器日常维护的能力。

## 6. 日常招新怎么做

### 正式开放前

进入网页后台“招新设置与录取结果”，逐项填写和确认：

- 招新周期；
- 申请开始与截止时间，时间按北京时间填写；
- 资料保留截止日期；
- 对外 QQ 群号或其他协会联系方式；
- 学院选项和本科年级选项；
- 入会申请通知、个人信息处理说明和香港服务器存储说明；
- 录取查询通知。

完成 [个人信息保护上线确认表](PRIVACY_IMPACT_CHECKLIST.md) 后再打开“开放入会申请”。使用一条明确标记的测试资料走完“提交—后台查看—删除”，确认无误后才对外发布链接。

### 招新进行中

- 每天或每两天登录后台确认申请数量和页面状态；
- 使用筛选和 CSV 导出处理申请，不把 CSV 发到公开群、公开网盘或 Git；
- 删除申请前核对姓名、学号和删除原因；
- 页面提示保存失败、数据数量异常或 500 错误时停止操作，按第 9 节处理。

### 发布录取结果

严格执行 [招新日常运行说明](RECRUITMENT_OPERATIONS.md) 的顺序：

1. 关闭录取查询；
2. 下载网站当前提供的 Excel 模板；
3. 删除或完整替换第 2 行的“张三”格式示例，再填写姓名、12 位学号、申请手机号、录取部门和录取状态；
4. 上传并查看脱敏预览；
5. 确认总数和录取/未录取数量，且预览中没有残留“张三”示例后发布；
6. 用一条测试记录确认本人查询结果；
7. 再开启录取查询。

不要上传带公式、宏、外部链接或额外列的文件。原始 Excel 和导出 CSV 都属于个人资料，应只保存在社团批准的受限位置。

### 招新结束

1. 关闭入会申请；
2. 需要时导出最终资料到受限位置；
3. 在约定日期关闭录取查询；
4. 到达保留期限时确认需要清理的数据库记录、Excel、CSV、录取名单和备份；
5. 批量删除、恢复或销毁数据前先明确范围，并让 Codex 协助执行和复核。

## 7. 最小服务器巡检

正常情况下每周检查一次，招新开放期间可增加到每天一次：

```bash
sudo radioctl status
sudo systemctl is-active radio-association nginx
sudo systemctl list-timers radio-association-backup.timer certbot.timer
```

期望：

- 应用和 Nginx 均为 `active`；
- `/healthz` 正常；
- 最近备份未超过 30 小时；
- 自动备份和证书续期 timer 有下一次执行时间；
- 当前发布 SHA 与准备上线的 Git 提交一致。

自动数据库备份位于 `/var/backups/radio-association/`，默认保留 14 天。不要手动复制正在运行的 SQLite 文件代替备份。

## 8. 发布代码更新

不熟悉 Git 或部署脚本时，直接在仓库中让 Codex完成检查、测试和部署准备。接交者只需要确认要上线的提交，并保留提交与推送决定权。

上线前必须满足：

- 当前分支是 `dev`；
- 工作区没有不明修改；
- 提交已推送到 `origin/dev`；
- GitHub Actions 已通过；
- 使用完整 40 位 SHA，不使用“最新版本”这种模糊目标。

在仓库根目录的 PowerShell 中：

```powershell
$Server = "43.129.242.112"
$User = "admin"
$Key = "$HOME\.ssh\id_ed25519"
$Commit = git rev-parse HEAD

.\scripts\radio-remote.ps1 -Action Deploy -Server $Server -User $User -IdentityFile $Key -Commit $Commit
.\scripts\radio-remote.ps1 -Action Status -Server $Server -User $User -IdentityFile $Key
.\scripts\radio-remote.ps1 -Action PublicStatus -Server $Server -User $User -IdentityFile $Key -Domain "wuxie.luciangray.net"
```

发布工具会创建部署前备份、安装锁定依赖、切换到精确版本并进行健康检查；失败时自动回到原版本。不要在 `/opt/radio-association/current` 中直接修改文件。

## 9. 常见故障的最短处理流程

### 网站打不开，但 SSH 可以登录

```bash
sudo radioctl status
sudo systemctl status radio-association nginx --no-pager
sudo journalctl -u radio-association -n 100 --no-pager
sudo nginx -t
```

- 应用失败：先保存输出，再执行 `sudo systemctl restart radio-association`；
- Nginx 配置检查成功但服务失败：执行 `sudo systemctl restart nginx`；
- 不要直接改数据库、删除发布目录或重新初始化。

### 网页后台保存或发布失败

1. 保持入会申请或录取查询关闭；
2. 截图记录页面提示，但不要截出密码、Token、完整手机号或名单；
3. 执行 `sudo radioctl status`；
4. 把状态输出和错误发生时间交给 Codex分析；
5. 不要反复上传或连续点击发布。

### 误删或数据数量异常

1. 立即停止新增、删除和导出；
2. 不要删除数据库或覆盖现有文件；
3. 执行 `sudo radioctl backup` 保存当前现场；
4. 列出备份但不要自行猜选：

```bash
sudo ls -lh /var/backups/radio-association/
```

5. 让 Codex核对目标备份后，再按 [部署与运维速查](OPERATIONS_QUICK_REFERENCE.md) 执行恢复。

### HTTPS 或证书异常

```bash
sudo nginx -t
sudo systemctl status nginx certbot.timer --no-pager
sudo certbot certificates
```

不要删除 `/etc/letsencrypt/`。如果问题涉及 DNS、腾讯云防火墙、公网 IP 或云服务器不可达，联系资产所有者；这类问题无法只靠服务器权限处理。

### SSH 无法连接

- 先确认使用 `admin`、正确私钥和服务器 IP；
- 不要反复尝试密码，服务器已关闭 SSH 密码认证；
- 如果所有公钥登录都失败，只能由腾讯云资产所有者通过控制台救援。

## 10. 明确禁止的操作

- 不在生产服务器运行 `scripts/init-db.js`；
- 不执行旧 `scripts/deploy.sh`；
- 不在运行目录执行 `git pull`、`git reset --hard` 或手工覆盖代码；
- 不直接复制活跃的 SQLite 主文件作为备份；
- 不向公网开放 5000 或 8080；
- 不把 `.env`、数据库、Excel、CSV、录取 JSON、密码、Token 或私钥提交到 Git；
- 不把真实个人资料粘贴给 Codex或发到公开群；可以提供脱敏后的结构、错误信息和记录数量；
- 不在不知道目标路径和恢复方案时批量删除文件。

## 11. 什么时候算交接完成

满足以下条件后，原维护者不再承担日常项目工作：

- 接交者自己的 SSH 公钥已安装并验证；
- 接交者能独立获得 sudo 权限、运行 `radioctl` 和完成手动备份；
- 接交者拥有新的招新负责人账号并能登录网页后台；
- 接交者拥有 GitHub 项目权限并理解 `dev` 是开发主线；
- 接交者独立完成一次设置检查、测试申请和测试录取演练；
- 接交者已阅读并确认云账号与域名账号不转移的限制；
- [交接验收清单](HANDOVER_CHECKLIST.md) 已填写并由双方保存；
- 明文密码和私有资料仅通过私下渠道交付，没有进入 Git 或公开文档。

交接完成后，接交者负责网站日常招新、部署和服务器维护。资产所有者只在必须使用腾讯云或阿里云控制台的异常情况下介入，不作为日常技术支持。
