# 招新运行说明

本项目后端为 FastAPI + SQLite。本地启动前，先将 `.env.example` 复制为 `.env`，再填入实际值；`.env` 与数据库文件均已被 Git 忽略。

## 配置招新负责人账号

招新负责人账号通过环境变量 `RECRUITMENT_OFFICER_ACCOUNTS` 配置，格式为 `用户名:密码:姓名;用户名2:密码2:姓名2`。密码只接受 PBKDF2 哈希，生成命令：

```bash
cd backend && uv run python ../scripts/hash-password.py
```

将生成的哈希填入 `.env`，例如：

```env
RECRUITMENT_OFFICER_ACCOUNTS="wuxie:pbkdf2_sha256$100000$...:无协负责人"
```

`JWT_SECRET` 使用一个足够长的随机字符串，不能保留示例文本。`JWT_SECRET` 与 `RECRUITMENT_OFFICER_ACCOUNTS` 均未设置时应用会直接拒绝启动。后台没有公开默认账号或默认密码。

## 数据备份与导出

每次调整环境变量或正式上线前，先停止服务，然后备份数据库：

```bash
mkdir -p local-backups
cp backend/data/database.sqlite "local-backups/database-$(date +%Y%m%d-%H%M%S).sqlite"
```

招新负责人页面的“导出 CSV”会导出当前搜索与筛选条件下的全部入会申请，并处理逗号、换行、引号和公式开头字符。

## 初始化基础数据

仅在首次部署、数据库文件尚不存在时执行：

```bash
bun scripts/init-db.js
```

该脚本会先清空再重新插入协会、部门、竞赛、荣誉、培训等静态表，属于破坏性操作，**生产环境不要反复运行**。入会申请数据不受影响，但重复执行没有意义的静态表重置应避免。

## 清理本地测试入会申请

没有专门的清理脚本。如需清空本地测试数据，停止服务后直接删除数据库文件再重启（表结构会自动重建），或用 sqlite3 手动执行：

```bash
sqlite3 backend/data/database.sqlite "DELETE FROM membership_applications;"
```

只允许在非生产环境执行。正式上线前请先备份。
