# 招新运行说明

本项目使用 Bun 与 SQLite。本地启动前，先将 `.env.example` 复制为 `.env`，再填入实际值；`.env` 与数据库文件均已被 Git 忽略。

## 配置单管理员

在 PowerShell 中生成 bcrypt 密码哈希：

```powershell
bun -e "const bcrypt = require('bcrypt'); bcrypt.hash(process.argv[1], 12).then(console.log)" "替换为你的后台密码"
```

将输出结果填写到 `.env` 的 `ADMIN_PASSWORD_HASH`。`JWT_SECRET` 使用一个足够长的随机字符串，不能保留示例文本。后台没有公开默认账号或默认密码。

## 报名开关

`REGISTRATION_OPEN=false` 时，前端和接口都会拒绝报名。正式开放前，设置为 `true`，并确认当前时间处于 `REGISTRATION_START` 与 `REGISTRATION_END` 之间。

## 数据备份与导出

每次调整环境变量、清空测试数据或正式上线前，先停止服务，然后在 PowerShell 中备份数据库：

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force .\local-backups | Out-Null
Copy-Item .\server\data\database.sqlite ".\local-backups\database-$stamp.sqlite"
```

管理员页面的“导出 CSV”会导出当前搜索与筛选条件下的全部报名信息，并处理逗号、换行、引号和公式开头字符。

## 清理本地测试报名

只允许在非生产环境执行：

```powershell
$env:NODE_ENV = 'development'
bun .\server\scripts\clear-test-registrations.js
```

脚本在 `NODE_ENV=production` 时会直接拒绝执行。正式上线前请先备份，再确认需要清空后才执行。
