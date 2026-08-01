# 无线电爱好者协会信息展示系统

> 当前开发主线是 `dev`，应跟踪 `origin/dev`；`master` 仅作为归档分支，`lucian` 保留旧 Bun/Express 实现与迁移历史，请勿继续在二者上开发或直接合并。

> 燕山大学无线电爱好者协会（无协）官方信息展示与招新管理系统

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![uv](https://img.shields.io/badge/uv-astral-purple?style=flat)](https://docs.astral.sh/uv/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org/)

---

## 项目简介

本项目是燕山大学无线电爱好者协会（成立于 1988 ）的官方信息展示与招新管理系统。系统提供协会风采展示、关于协会、竞赛培训记录、在线入会申请、招新负责人后台等功能，旨在为协会提供一个集宣传与管理于一体的信息化平台。

### 协会简介

- **协会全称**：燕山大学无线电爱好者协会
- **成立年份**：1988 年
- **协会口号**：无协天下，天下无协
- **协会宗旨**：挖掘潜质，就在无协

---

## 技术架构

```
┌──────────────────────────────────────────────┐
│                   前端 (Frontend)              │
│         纯 HTML / CSS / JavaScript            │
│   页面位于 public/html/ 目录下                │
└──────────────────┬───────────────────────────┘
                   │ HTTP / REST API
┌──────────────────▼───────────────────────────┐
│               后端 (Backend)                   │
│          FastAPI + Python 3.11+              │
│  backend/routes/  backend/models/             │
└──────────────────┬───────────────────────────┘
                   │ sqlite3 (Python stdlib)
┌──────────────────▼───────────────────────────┐
│             数据库 (Database)                  │
│               SQLite 3                        │
│         backend/data/database.sqlite          │
└──────────────────────────────────────────────┘
```

| 层级 | 技术选型 |
|------|----------|
| 前端 | HTML5 + CSS3 + 原生 JavaScript |
| 后端 | FastAPI + Python 3.11+ |
| 依赖管理 | uv |
| 数据库 | SQLite 3（Python 标准库 `sqlite3`） |
| 认证 | JWT（PyJWT）+ PBKDF2 密码哈希 |
| 安全防护 | 登录/提交速率限制（内存固定窗口） |
| 导出与导入 | CSV 导出、负责人网页 Excel 校验/脱敏预览/录取名单发布 |

---

## 功能特性

### 对外展示（访客）

- **首页** — 固定单屏落地页，协会口号、入口动画、快捷入口
- **关于协会** — 协会概况、活动影像、协会数据、部门介绍
- **协会活动** — 竞赛活动、文娱活动等综合入口
- **竞赛活动** — 历年竞赛记录（展望杯、DIY 达人赛、指尖风暴大赛）
- **文娱活动** — 休闲娱乐活动展示
- **培训记录** — 线下培训、专业知识授课、焊接实训等
- **荣誉墙** — 省级/校级荣誉展示
- **在线入会申请** — 新生在线填写入会申请表单提交
- **录取查询** — 通过学号和手机号匹配查询录取结果

### 后台管理（招新负责人）

- **登录** — JWT 认证，支持“记住我”
- **入会申请管理** — 查看所有入会申请，支持分页、搜索、筛选
- **数据导出** — 将入会申请导出为 CSV
- **招新设置** — 编辑开放时间、通知、隐私告知、联系方式和表单选项
- **录取结果** — 下载模板、上传 Excel、校验、脱敏预览并确认发布

---

## 项目结构

```
radio-association/
├── package.json                  # 开发、验证、图片和导出脚本
├── .env.example                  # 本地环境变量示例
├── README.md                     # 项目说明
├── config/
│   └── recruitment.example.json # 招新业务配置示例
├── docs/                         # 文档与决策记录
├── backend/                      # FastAPI 后端（当前活跃后端）
│   ├── app.py                    # FastAPI 应用入口
│   ├── pyproject.toml            # uv 项目配置与依赖
│   ├── config/                   # 数据库与招新配置
│   ├── models/                   # SQLite 数据访问
│   ├── routes/                   # FastAPI 路由
│   ├── tests/                    # API、运维和部署工具测试
│   └── data/                     # 本地 SQLite 数据（不提交）
├── public/                       # 前端静态资源
│   ├── html/                     # 原生 HTML、CSS、JavaScript
│   ├── image/                    # 会徽与生成的响应式 WebP
│   └── favicon.ico
├── source-assets/
│   └── image-originals/          # 图片原稿，不进入 git archive
├── deployment/                   # Nginx、systemd 与运维配置
├── scripts/                      # 图片、导出、检查与运维工具
└── tests/
    ├── e2e/                      # Playwright 桌面与移动端测试
    └── fixtures/                 # 隔离的招新和录取测试配置
```

### 文档入口

- 接交者首先阅读 [项目交接与接手指南](docs/HANDOVER_GUIDE.md)，交接当天使用 [项目交接验收清单](docs/HANDOVER_CHECKLIST.md)。
- 招新负责人日常使用 [招新日常运行说明](docs/RECRUITMENT_OPERATIONS.md)，正式开放前完成 [个人信息保护上线确认表](docs/PRIVACY_IMPACT_CHECKLIST.md)。
- 服务器维护使用 [部署与运维速查](docs/OPERATIONS_QUICK_REFERENCE.md)；需要理解部署设计时再阅读 [部署与运维架构](docs/DEPLOYMENT_AND_OPERATIONS.md)。
- 数据结构见 [数据库说明](docs/DATABASE.md)；代码命名原因保留在 `docs/adr/`。

---

## 快速开始

### 环境要求

- **Python** >= 3.11
- **uv**（安装方式见 https://docs.astral.sh/uv/getting-started/installation/）
- **Bun**（运行项目脚本、前端检查、录取导出和 Playwright 测试）

### 1. 克隆项目

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. 安装 Python 依赖

```bash
cd backend
uv sync
```

### 3. 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | 服务端口号，默认 `5000` |
| `DATABASE_PATH` | 否 | SQLite 数据库路径，相对路径基于仓库根目录，默认 `backend/data/database.sqlite` |
| `JWT_SECRET` | **是** | JWT 签名密钥，生产环境必须设置为随机长字符串。未设置时应用启动失败。 |
| `RECRUITMENT_OFFICER_ACCOUNTS` | **是** | 招新负责人账号列表，格式 `用户名:PBKDF2密码哈希:显示名称;...`。未设置时应用启动失败。 |
| `RECRUITMENT_CONFIG_PATH` | 否 | 私有招新业务配置路径；生产环境使用 `/var/lib/radio-association/private/recruitment.json`。 |
| `ADMISSIONS_DATA_PATH` | 否 | 私有录取名单路径；生产环境使用 `/var/lib/radio-association/private/admissions.json`。 |

在项目根目录从示例复制 `.env`（此文件不会提交）：

```env
PORT=5000
JWT_SECRET="your-secret-key-change-in-production"
RECRUITMENT_OFFICER_ACCOUNTS="example-officer:pbkdf2_sha256$迭代次数$盐$摘要:示例负责人"
```

> **安全提示**：`JWT_SECRET` 与 `RECRUITMENT_OFFICER_ACCOUNTS` 不再提供硬编码默认值。若未设置，应用启动时会直接报错。由于值中可能包含 `#` 等字符，建议用双引号包裹。
>
> 密码必须是 PBKDF2 哈希，使用脚本生成：
>
> ```bash
> cd backend && uv run python ../scripts/hash-password.py
> ```
>
> 将生成的哈希填入环境变量，例如：
> `RECRUITMENT_OFFICER_ACCOUNTS="example-officer:pbkdf2_sha256$100000$...:示例负责人"`

### 4. 初始化本地展示种子数据（可选）

```bash
bun scripts/init-db.js
```

该脚本会先清空再重新插入协会、部门、竞赛、荣誉、培训等基础数据，属于破坏性操作，仅用于明确需要这些 API 种子数据的本地环境。生产部署和故障排查不得自行运行。

### 5. 启动服务

```bash
bun run dev          # 通过 package.json 运行 uvicorn 开发服务器（实际为 Python 后端）
```

或直接在 `backend/` 目录启动：

```bash
cd backend
uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000
```

服务默认运行在 `http://localhost:5000`，访问根路径会自动跳转到 `http://localhost:5000/html/index.html`。

### 6. 发布录取名单

招新负责人登录后进入“招新设置与录取结果”，下载标准模板并按以下列顺序填写：

| 列 | 字段 | 说明 |
|----|------|------|
| A | 姓名 | 学生姓名 |
| B | 学号 | 学生12位学号 |
| C | 手机号 | 学生入会申请时填写的手机号 |
| D | 录取部门 | 录取部门名称（可选） |
| E | 录取状态 | 仅限“已录取”或“未录取” |

网页会校验文件大小、表头、字段、重复学号、公式、宏和外部链接；校验通过后只展示少量脱敏预览，负责人再次确认才会原子发布。发布新名单前必须先关闭录取查询，发布完成后再单独开启。

网页故障时可使用备用导出脚本，输出路径必须位于 Git 仓库之外：

```bash
bun scripts/export-admissions.js 工作簿1.xlsx C:\私有目录\admissions.json
```

生产录取名单始终位于非公开私有目录，录取查询会同时核验学号和申请手机号。

---

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/departments` | 获取所有部门 |
| GET | `/api/competitions` | 获取竞赛列表（按年份倒序） |
| GET | `/api/trainings` | 获取培训记录 |
| GET | `/api/honors` | 获取荣誉列表 |
| GET | `/api/association` | 获取协会基本信息 |
| POST | `/api/membership-applications` | 提交入会申请 |
| GET | `/api/recruitment/config` | 获取公开招新安排 |
| POST | `/api/admissions/query` | 按学号和申请手机号查询本人录取结果 |

### 招新负责人接口（需 JWT 认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/recruitment-officers/login` | 招新负责人登录 |
| POST | `/api/recruitment-officers/logout` | 注销 |
| GET | `/api/recruitment-officers/verify` | 验证 Token 有效性 |
| GET | `/api/recruitment-officers/profile` | 获取招新负责人信息 |
| GET | `/api/membership-applications` | 获取入会申请列表（分页/搜索/排序） |
| GET | `/api/membership-applications/stats` | 获取入会申请统计 |
| GET | `/api/membership-applications/{membership_application_id}` | 获取指定入会申请详情 |
| GET | `/api/membership-applications/export.csv` | 导出当前筛选条件下的入会申请 |
| DELETE | `/api/membership-applications/{membership_application_id}` | 删除指定入会申请 |
| GET/PUT | `/api/recruitment/manage/config` | 读取或更新招新业务设置 |
| GET | `/api/admissions/manage/status` | 获取录取名单发布状态 |
| GET | `/api/admissions/manage/template.xlsx` | 下载录取名单模板 |
| POST | `/api/admissions/manage/preview` | 校验并脱敏预览录取 Excel |
| POST | `/api/admissions/manage/publish` | 发布已确认的预览名单 |

---

## 数据模型

### 入会申请（MembershipApplication）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | String | 是 | 姓名 |
| studentId | String | 是 | 学号 |
| college | String | 是 | 学院 |
| grade | String | 是 | 年级 |
| phone | String | 是 | 手机号 |
| email | String | 是 | 邮箱 |
| self_introduction | String | 是 | 自我介绍 |
| expectation | String | 否 | 加入期望 |
| createdAt | DateTime | 自动 | 提交时间 |
| updatedAt | DateTime | 自动 | 更新时间 |

---

## 脚本说明

| 脚本 | 命令 | 说明 |
|------|------|------|
| start | `cd backend && uv run uvicorn app:app --host 127.0.0.1 --port 5000` | 启动仅本机监听的服务 |
| dev | `cd backend && uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000` | 开发热重载 |
| images:build | `bun run images:build` | 从 `source-assets/image-originals` 生成响应式 WebP 与图片清单 |
| init | `bun scripts/init-db.js` | 重建本地展示种子数据（破坏性，仅限明确需要的本地环境） |
| export:admissions | `bun scripts/export-admissions.js` | 将 Excel 录取名单导出为 JSON |
| hash-password | `cd backend && uv run python ../scripts/hash-password.py` | 生成 PBKDF2 密码哈希，用于 `.env` |
| verify | `bun run verify` | 运行敏感文件、源文件、Python 和 API 检查 |
| verify:release | `bun run verify:release` | 在 `verify` 基础上运行桌面、320px 与 390px E2E |

生产服务器不直接使用上述开发命令，也不开放公网 5000 端口。精确 SHA 发布、备份、恢复和回滚请按 [部署与运维速查](docs/OPERATIONS_QUICK_REFERENCE.md) 执行。

后续接交者请从 [项目交接与接手指南](docs/HANDOVER_GUIDE.md) 开始，并在最终交接当天逐项完成 [项目交接验收清单](docs/HANDOVER_CHECKLIST.md)。日常招新不要求理解后端或服务器实现。

---

## 安全说明

- 招新负责人密码仅接受 PBKDF2-HMAC-SHA256 哈希，使用 `scripts/hash-password.py` 生成。
- `JWT_SECRET` 与 `RECRUITMENT_OFFICER_ACCOUNTS` 不再提供硬编码默认值，未设置时应用启动失败。
- API 认证使用 JWT 令牌机制。
- 入会申请管理接口需要 Bearer Token 认证。
- 登录、入会申请和录取查询均带有简单的内存速率限制；生产环境固定使用一个 Uvicorn 进程，与 SQLite 单进程设计一致。
- 入会申请需要确认个人信息处理说明；确认值只用于提交校验，不写入业务表。
- 生产环境必须使用随机 `JWT_SECRET` 和仅保存在服务器受限配置中的负责人密码哈希。

---

> 无线电爱好者协会 — 挖掘潜质，就在无协！
