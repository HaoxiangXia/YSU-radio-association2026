# 项目交接与接手指南

本文是后续接交者的统一入口。接交者不需要理解 FastAPI、SQLite、Nginx 或部署脚本内部实现，只需按本文和链接的操作说明执行。

## 1. 先记住这四件事

1. 网站地址：<https://wuxie.luciangray.net>。
2. 日常招新通过网页后台完成，不需要登录服务器。
3. 日常服务器维护先用 SSH 登录 `admin`，再执行 `su -` 进入 root shell，统一使用 `radioctl`；不要在服务器运行目录中执行 `git pull`、`git reset` 或旧 `scripts/deploy.sh`。
4. 任何误删、数据异常或恢复操作都先停止继续操作、保留现场，再检查备份；不要删除数据库“重置”。

相关文档：

- [招新日常运行说明](RECRUITMENT_OPERATIONS.md)：开放申请、处理资料、发布录取结果和结束招新；
- [部署与运维速查](OPERATIONS_QUICK_REFERENCE.md)：状态、备份、发布、回滚和恢复命令；
- [个人信息保护上线确认表](PRIVACY_IMPACT_CHECKLIST.md)：正式开放前必须由负责人确认的业务事项；
- [数据库说明](DATABASE.md)：仅在需要理解数据结构或排查复杂故障时阅读。

## 2. 当前生产基线

以下只记录不会随每次招新操作变化的生产基线。实际部署 SHA、业务开关、申请数量和录取名单状态不在文档中写死，交接当天须按第 5 节实时核对：

- Git 开发主线：`dev`，跟踪 `origin/dev`；服务器实际部署版本以 `radioctl status` 为准，不要求与仅包含文档变更的最新提交机械相等；
- 服务器：腾讯云中国香港，公网 IPv4 `43.129.242.112`；
- 域名：`wuxie.luciangray.net`，A 记录指向上述服务器；
- HTTPS：Let's Encrypt 证书已启用，HTTP 自动跳转 HTTPS，证书由 `certbot.timer` 自动续期；
- 应用：`radio-association.service`、`nginx.service` 和自动备份 timer 正常；
- 公网只提供 80/443，应用端口 5000 和预览端口 8080 不对公网开放；
- 入会申请、录取查询、申请数量和录取名单状态均由接交者在网页后台实时确认；
- 初次上线已完成申请、后台、Excel 录取发布、备份、恢复、回滚、HTTPS 和多网络测试，后续发布与正式交接仍须重新验收。

正式交接当天应重新执行本文第 5 节，不要把本文描述当作实时状态。

## 3. 权限和资产边界

### 接交者获得

- GitHub 仓库的项目协作权限；
- 招新负责人网页账号；
- 服务器 `admin` 账号的 SSH 公钥登录；
- 私下交付的 root 强密码，通过 `su -` 取得服务器操作系统和应用的完整管理权限。

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

当前维护者或 Codex 将公钥追加到服务器 `admin` 账号，不覆盖已有公钥。完成后，由接交者亲自在自己的电脑建立新连接验证。root 强密码由当前维护者通过私下渠道另行交付。

### 4.3 接交者验证登录

```powershell
ssh -i "$HOME\.ssh\id_ed25519" admin@43.129.242.112
```

登录后执行：

```bash
id
su -
id
radioctl status
exit
```

预期结果：

- `id` 显示当前用户为 `admin`，并包含 `sudo` 组；
- `su -` 接受私下交付的 root 密码，第二次 `id` 显示 `uid=0(root)`；
- root shell 中的 `radioctl status` 显示应用健康、当前发布 SHA、数据库和备份状态。

root 禁止直接 SSH 登录，SSH 密码认证也保持关闭。root 密码只通过私下渠道交付，不写进 Git、聊天记录、截图或本文；不要为了方便而开启 root SSH 或密码 SSH。现有 `scripts/radio-remote.ps1` 使用 `BatchMode` 和非交互 `sudo`，因此不能直接以当前 `admin` 权限模型执行需要 root 的动作。

## 5. 接手当天的 15 分钟验收

接交者独立完成以下操作，当前维护者只观察，不代替操作：

1. 用自己的 SSH 私钥登录 `admin`。
2. 执行 `su -`，进入 root shell 后运行 `radioctl status`，检查完成后执行 `exit`。
3. 打开 <https://wuxie.luciangray.net>，确认首页和 HTTPS 正常。
4. 打开网站页脚“招新负责人入口”，用交接到的新账号登录。
5. 进入“入会申请管理”，确认当前记录数量符合预期。
6. 进入“招新设置与录取结果”，确认入会申请和录取查询均保持关闭。
7. 下载一次录取 Excel 模板，用虚构数据完成校验和脱敏预览，但不要确认发布。
8. 执行一次手动备份：

```bash
su -
radioctl backup
radioctl status
exit
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
su -
radioctl status
systemctl is-active radio-association nginx
systemctl list-timers radio-association-backup.timer certbot.timer
exit
```

期望：

- 应用和 Nginx 均为 `active`；
- `/healthz` 正常；
- 最近备份未超过 30 小时；
- 自动备份和证书续期 timer 有下一次执行时间；
- 当前发布 SHA 与上一次确认上线的代码提交一致；如果 `dev` 后续只有文档提交，可以记录差异而不必为了对齐 SHA 重新部署。

自动数据库备份位于 `/var/backups/radio-association/`，默认保留 14 天。不要手动复制正在运行的 SQLite 文件代替备份。

## 8. 发布代码更新

不熟悉 Git 或部署脚本时，直接在仓库中让 Codex 完成检查、测试、发布归档、校验和计算与上传准备。接交者只需要确认要上线的提交、保留提交与推送决定权，并在交互式 SSH 中输入 root 密码执行最终发布命令。

上线前必须满足：

- 当前分支是 `dev`；
- 工作区没有不明修改；
- 提交已推送到 `origin/dev`；
- GitHub Actions 已通过；
- 使用完整 40 位 SHA，不使用“最新版本”这种模糊目标。

当前 `admin` 不具备非交互 sudo，因此不要把下列参数直接传给 `scripts/radio-remote.ps1 -Action Deploy`。安全的低频更新流程是：

1. 让 Codex 核对工作区、远端 `dev`、CI 和目标 40 位 SHA；
2. 让 Codex 生成源码归档、SHA-256，并以 `admin` 上传到服务器 `/tmp/`；
3. 接交者登录 `admin`，执行 `su -`；
4. 使用 Codex 给出的完整参数执行 `radioctl deploy <临时归档> <40位SHA> <SHA-256>`；
5. 执行 `radioctl status`，确认健康后删除该明确路径下的临时归档并退出 root shell。

`radioctl deploy` 会创建部署前备份、安装锁定依赖、切换到精确版本并进行健康检查；失败时自动回到原版本。不要在 `/opt/radio-association/current` 中直接修改文件，也不要把 root 密码交给 Codex 或写进自动化命令。

## 9. 常见故障的最短处理流程

### 网站打不开，但 SSH 可以登录

```bash
su -
radioctl status
systemctl status radio-association nginx --no-pager
journalctl -u radio-association -n 100 --no-pager
nginx -t
```

- 应用失败：先保存输出，再在 root shell 执行 `systemctl restart radio-association`；
- Nginx 配置检查成功但服务失败：在 root shell 执行 `systemctl restart nginx`；
- 不要直接改数据库、删除发布目录或重新初始化。

### 网页后台保存或发布失败

1. 保持入会申请或录取查询关闭；
2. 截图记录页面提示，但不要截出密码、Token、完整手机号或名单；
3. 进入 root shell，执行 `radioctl status`；
4. 把状态输出和错误发生时间交给 Codex 分析；
5. 不要反复上传或连续点击发布。

### 误删或数据数量异常

1. 立即停止新增、删除和导出；
2. 不要删除数据库或覆盖现有文件；
3. 进入 root shell，执行 `radioctl backup` 保存当前现场；
4. 列出备份但不要自行猜选：

```bash
ls -lh /var/backups/radio-association/
```

5. 让 Codex 核对目标备份后，再按 [部署与运维速查](OPERATIONS_QUICK_REFERENCE.md) 执行恢复。

### HTTPS 或证书异常

```bash
su -
nginx -t
systemctl status nginx certbot.timer --no-pager
certbot certificates
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
- 不把真实个人资料粘贴给 Codex 或发到公开群；可以提供脱敏后的结构、错误信息和记录数量；
- 不在不知道目标路径和恢复方案时批量删除文件。

## 11. 什么时候算交接完成

满足以下条件后，原维护者不再承担日常项目工作：

- 接交者自己的 SSH 公钥已安装并验证；
- 接交者能通过 `su -` 取得 root 权限、运行 `radioctl` 和完成手动备份；
- 接交者拥有新的招新负责人账号并能登录网页后台；
- 接交者拥有 GitHub 项目权限并理解 `dev` 是开发主线；
- 接交者独立完成一次设置检查、测试申请，以及虚构录取表的校验和脱敏预览；
- 接交者已阅读并确认云账号与域名账号不转移的限制；
- [交接验收清单](HANDOVER_CHECKLIST.md) 已填写并由双方保存；
- 明文密码和私有资料仅通过私下渠道交付，没有进入 Git 或公开文档。

交接完成后，接交者负责网站日常招新、部署和服务器维护。资产所有者只在必须使用腾讯云或阿里云控制台的异常情况下介入，不作为日常技术支持。
