# 数据库说明

本文档说明 `radio-association` 项目使用的 SQLite 数据库：文件位置、连接方式、表结构、索引与迁移机制，以及**不**存放在数据库中的数据。

## 概览

| 项目 | 说明 |
|---|---|
| 数据库引擎 | SQLite 3（Python 标准库 `sqlite3`，无 ORM） |
| 默认文件路径 | `backend/data/database.sqlite`（已 gitignore） |
| 路径配置 | 环境变量 `DATABASE_PATH`；相对路径基于仓库根目录解析 |
| 连接参数 | `PRAGMA journal_mode = WAL`、`PRAGMA foreign_keys = ON`、`row_factory = sqlite3.Row`、`check_same_thread=False` |
| Schema 初始化 | `backend/config/database.py` 的 `initialize_database()` 在建连时执行 `CREATE TABLE IF NOT EXISTS` 并应用待处理的幂等迁移（模块导入/应用启动时自动运行） |
| 静态数据种子 | `scripts/init-db.js`（Bun，**破坏性**，仅用于明确需要重建展示种子数据的本地环境；生产环境禁止运行） |

路由通过 FastAPI 依赖 `get_db`（`backend/config/database.py`）获取连接；每次请求一个连接，用后即关闭。所有 SQL 使用 `?` 位置参数绑定，排序列名走白名单。

## 命名约定

- 数据库列名保留 camelCase（`createdAt`、`studentId`），与前端及旧 schema 兼容；Python 变量使用 snake_case。
- 数组类数据以 JSON 文本存储在 TEXT 列中，由 model 层手动 `json.loads`（见各表备注）。

## 表结构

### `association` — 协会信息（单行）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT NOT NULL | 协会名称 |
| `englishName` | TEXT | 英文名 |
| `abbreviation` | TEXT | 缩写 |
| `establishmentYear` | INTEGER | 成立年份 |
| `motto` | TEXT | 座右铭 |
| `slogan` | TEXT | 口号 |
| `description` | TEXT | 简介 |
| `memberCount` | INTEGER | 成员数 |
| `starRating` | INTEGER | 星级 |
| `awards` | TEXT | **JSON 数组文本**，model 层解析为列表 |

### `competitions` — 竞赛

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT NOT NULL | 竞赛名称 |
| `year` | INTEGER | 年份 |
| `participants` | INTEGER | 参赛人数 |
| `description` | TEXT | 简介 |
| `tracks` | TEXT | **JSON 数组文本**（赛道/组别），model 层解析为列表 |

### `departments` — 部门

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT NOT NULL | 部门名称 |
| `description` | TEXT | 简介 |

### `honors` — 荣誉

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `title` | TEXT NOT NULL | 荣誉名称 |
| `rank` | INTEGER | 排序权重 |
| `year` | INTEGER | 年份 |
| `description` | TEXT | 简介 |

### `trainings` — 培训

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `year` | TEXT | 年份 |
| `type` | TEXT | 培训类型 |
| `count` | INTEGER | 场次 |
| `participants` | INTEGER | 参与人数 |
| `description` | TEXT | 简介 |

### `membership_applications` — 入会申请（核心业务表）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT NOT NULL | 姓名 |
| `studentId` | TEXT NOT NULL | 学号，**唯一索引** `ux_membership_applications_student_id`（见下） |
| `college` | TEXT NOT NULL | 学院 |
| `grade` | TEXT NOT NULL | 年级 |
| `phone` | TEXT NOT NULL | 电话 |
| `email` | TEXT NOT NULL | 邮箱 |
| `self_introduction` | TEXT NOT NULL | 自我介绍 |
| `expectation` | TEXT | 期望（可空） |
| `createdAt` | TEXT | 默认 `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`，UTC ISO8601 |
| `updatedAt` | TEXT | 同上默认值；应用层目前不做更新操作 |

查询能力（`backend/models/membership_application.py` 的 `find_all`）：分页（`page`/`limit`）、按 `college`/`grade` 过滤、`search` 模糊搜索、排序（`sort_by` 白名单：`createdAt`、`name`、`studentId`、`college`、`grade`；`sort_order` 仅限 `asc`/`desc`）。

### `schema_migrations` — 迁移记录

| 列 | 类型 | 说明 |
|---|---|---|
| `name` | TEXT PRIMARY KEY | 迁移名 |
| `appliedAt` | TEXT NOT NULL | 应用时间（UTC ISO8601） |

## 索引与迁移

### 唯一索引 `ux_membership_applications_student_id`

- 保证一个学号只能提交一份入会申请。
- 由迁移 `0001_unique_membership_application_student_id` 创建，记录于 `schema_migrations`。
- 迁移是**幂等**的：索引与迁移记录都存在时直接跳过。
- 应用迁移前若检测到重复学号，抛出 `DatabaseMigrationError` 并**中止启动**，不自动删除或修改任何数据——需人工清理后重启。
- 迁移前默认自动备份整库到 `backend/data/migration-backups/`（文件名含迁移名与时间戳）；`initialize_database(backup_before_migrations=False)` 可关闭。
- 迁移在 `BEGIN IMMEDIATE` 事务中执行，失败即回滚。

## 不在数据库中的数据

以下数据**不经过 SQLite**，排查问题时不要到数据库里找：

| 数据 | 存放位置 | 来源 |
|---|---|---|
| 录取名单（录取查询） | 生产环境 `/var/lib/radio-association/private/admissions.json`；本地由 `ADMISSIONS_DATA_PATH` 指定 | 负责人网页上传 Excel，经校验和脱敏预览后原子发布；命令行导出仅作备用 |
| 招新负责人账号 | 环境变量 `OFFICER_USERNAME` + `OFFICER_PASSWORD_HASH`（仅一个账号） | 哈希用 `scripts/hash-password.py` 生成 |
| 招新配置（周期、申请表单、录取查询开关等） | JSON 配置文件，路径由 `RECRUITMENT_CONFIG_PATH` 指定 | `backend/config/recruitment.py` 加载并校验 |
| 隐私确认值 | 不持久化 | `privacyAccepted` 只用于提交时校验，写入数据库前会被移除 |

网页可以原子替换录取名单，但没有“清空测试名单”按钮。交接演练只做 Excel 校验和脱敏预览；正式名单删除或数据到期清理必须先明确范围、备份和恢复方案，再由维护者执行。

## 常用操作

```bash
# 本地开发：明确需要时重建展示种子数据（破坏性，禁止用于生产）
bun scripts/init-db.js

# 直接查看数据库（需本机安装 sqlite3 CLI）
sqlite3 backend/data/database.sqlite

# 故障时在本地导出录取名单 JSON（输出必须在仓库外）
bun scripts/export-admissions.js 工作簿1.xlsx C:\私有目录\admissions.json
```

注意：WAL 模式下数据库目录还会出现 `database.sqlite-wal` / `database.sqlite-shm` 文件，属正常现象。生产服务运行时不得直接复制这些文件或主数据库作为备份，统一使用 `radioctl backup` 调用 SQLite 在线 Backup API，并核对完整性检查和 SHA-256 结果。
