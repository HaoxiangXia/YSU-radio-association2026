# 无线电爱好者协会信息展示系统

> 燕山大学无线电爱好者协会（无协）官方信息展示与招新管理系统

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![uv](https://img.shields.io/badge/uv-astral-purple?style=flat)](https://docs.astral.sh/uv/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

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
│         server/data/database.sqlite           │
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
| 导出 | CSV（前端生成并下载）、Excel → JSON（脚本） |

`server/` 目录为原 Express/Bun 后端归档，目前保留作参考，计划后端完全稳定后删除。

---

## 功能特性

### 对外展示（访客）

- **首页** — 固定单屏落地页，协会口号、入口动画、快捷入口
- **关于协会** — 协会概况、招新视频、协会数据、部门介绍
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

---

## 项目结构

```
radio-association/
├── package.json                  # Bun 脚本配置（用于导出脚本）
├── pyproject.toml                # 后端 Python 项目配置（位于 backend/）
├── .env                          # 环境变量（端口号、JWT 密钥等）
├── AGENTS.md                     # 项目规范与开发约定
├── CONTEXT.md                    # 领域术语表
├── README.md                     # 项目说明
├── docs/                         # 文档与决策记录
│   └── adr/
│       ├── 0001-membership-application-identifier.md
│       └── 0002-recruitment-officer-identifier.md
├── backend/                      # FastAPI 后端（当前活跃后端）
│   ├── app.py                    # FastAPI 应用入口
│   ├── pyproject.toml            # uv 项目配置与依赖
│   ├── utils/                    # 安全工具：密码哈希、速率限制
│   │   └── security.py
│   ├── config/
│   │   └── database.py           # SQLite 连接、建表与迁移
│   ├── models/                   # 数据模型
│   │   ├── association.py
│   │   ├── competition.py
│   │   ├── department.py
│   │   ├── honor.py
│   │   ├── membership_application.py
│   │   └── training.py
│   └── routes/                   # API 路由
│       ├── recruitment_officers.py
│       ├── association.py
│       ├── competitions.py
│       ├── departments.py
│       ├── honors.py
│       ├── membership_applications.py
│       └── trainings.py
├── server/                       # 原 Express/Bun 后端（归档，即将删除）
│   ├── app.js
│   ├── initDB.js
│   ├── config/database.js
│   ├── models/
│   └── routes/
├── public/                       # 前端静态资源
│   ├── html/                     # 纯 HTML 页面
│   │   ├── index.html
│   │   ├── about-association.html
│   │   ├── activities.html
│   │   ├── competition-activities.html
│   │   ├── recreational-activities.html
│   │   ├── honors.html
│   │   ├── trainings.html
│   │   ├── membership-application.html   # 在线入会申请
│   │   ├── membership-applications.html  # 入会申请管理（需登录）
│   │   ├── admission.html
│   │   ├── admin-login.html
│   │   ├── styles.css
│   │   ├── common.js
│   │   ├── data.js
│   │   └── home-effects.js
│   ├── images/
│   ├── image/
│   ├── data/                     # 录取查询数据
│   │   └── admission-results.json
│   └── favicon.ico
├── backup/                       # 备份目录
│   └── vue-source/               # 原 Vue 源码备份
└── scripts/
    ├── export-admissions.js      # Excel → JSON 导出工具
    └── hash-password.py          # 生成 PBKDF2 密码哈希
```

---

## 快速开始

### 环境要求

- **Python** >= 3.11
- **uv**（安装方式见 https://docs.astral.sh/uv/getting-started/installation/）
- **Bun**（仅用于运行 `server/initDB.js` 和 `scripts/export-admissions.js`）

### 1. 克隆项目

```bash
git clone <repository-url>
cd radio-association
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
| `JWT_SECRET` | **是** | JWT 签名密钥，生产环境必须设置为随机长字符串。未设置时应用启动失败。 |
| `RECRUITMENT_OFFICER_ACCOUNTS` | **是** | 招新负责人账号列表，格式 `用户名:密码:姓名;...`。旧环境变量 `ADMIN_ACCOUNTS` 仍可作为兼容性回退读取。未设置时应用启动失败。 |

在项目根目录创建 `.env` 文件：

```env
PORT=5000
JWT_SECRET="your-secret-key-change-in-production"
RECRUITMENT_OFFICER_ACCOUNTS="wuxie:513513#:无协管理员;admin2:pass2#:技术负责人"
```

> **安全提示**：`JWT_SECRET` 与 `RECRUITMENT_OFFICER_ACCOUNTS` 不再提供硬编码默认值。若未设置，应用启动时会直接报错。由于值中可能包含 `#` 等字符，建议用双引号包裹。
>
> 密码支持旧版明文（保留兼容性）或 PBKDF2 哈希；推荐使用脚本生成哈希：
>
> ```bash
> cd backend && uv run python ../scripts/hash-password.py
> ```
>
> 将生成的哈希填入环境变量，例如：
> `RECRUITMENT_OFFICER_ACCOUNTS="wuxie:pbkdf2_sha256$100000$...:无协管理员"`

### 4. 初始化数据库

```bash
bun server/initDB.js
```

执行成功后会初始化协会、部门、竞赛、荣誉、培训等基础数据。

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

### 6. 导出录取名单（可选）

Excel 工作簿第一行应为表头，后续行按以下列顺序填写：

| 列 | 字段 | 说明 |
|----|------|------|
| A | 姓名 | 学生姓名 |
| B | 学号 | 学生12位学号 |
| C | 手机号 | 学生入会申请时填写的手机号 |
| D | 录取部门 | 录取部门名称（可选） |
| E | 录取状态 | 如“已录取”（可选） |

执行导出：

```bash
bun scripts/export-admissions.js
```

该命令读取 `工作簿1.xlsx` 中的录取数据，生成 `public/data/admission-results.json` 供前端录取查询使用。录取查询时会同时核验学号和手机号。

---

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/association` | 获取协会基本信息 |
| GET | `/api/departments` | 获取所有部门 |
| GET | `/api/competitions` | 获取竞赛列表（按年份倒序） |
| GET | `/api/trainings` | 获取培训记录 |
| GET | `/api/honors` | 获取荣誉列表 |
| POST | `/api/membership-applications` | 提交入会申请 |

### 招新负责人接口（需 JWT 认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/recruitment-officers/login` | 招新负责人登录 |
| POST | `/api/recruitment-officers/logout` | 注销 |
| GET | `/api/recruitment-officers/verify` | 验证 Token 有效性 |
| GET | `/api/recruitment-officers/profile` | 获取招新负责人信息 |
| GET | `/api/membership-applications` | 获取入会申请列表（分页/搜索/排序） |
| DELETE | `/api/membership-applications/:id` | 删除指定入会申请 |

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
| start | `cd backend && uv run uvicorn app:app --host 0.0.0.0 --port 5000` | 启动生产服务器 |
| dev | `cd backend && uv run uvicorn app:app --reload --host 0.0.0.0 --port 5000` | 开发热重载 |
| init | `bun server/initDB.js` | 初始化 SQLite 数据库 |
| export:admissions | `bun scripts/export-admissions.js` | 将 Excel 录取名单导出为 JSON |
| hash-password | `cd backend && uv run python ../scripts/hash-password.py` | 生成 PBKDF2 密码哈希，用于 `.env` |

---

## 安全说明

- 招新负责人密码默认使用 PBKDF2-HMAC-SHA256 哈希；旧版明文密码仍可作为兼容性回退使用，但建议尽快迁移为哈希值。
- `JWT_SECRET` 与 `RECRUITMENT_OFFICER_ACCOUNTS` 不再提供硬编码默认值，未设置时应用启动失败。
- API 认证使用 JWT 令牌机制。
- 入会申请管理接口需要 Bearer Token 认证。
- 登录和入会申请提交均带有简单的内存速率限制，生产环境如需多进程部署请接入 Redis 等共享存储。
- 生产环境请务必修改 `.env` 中的 `JWT_SECRET` 和默认招新负责人密码。

---

## License

MIT License

---

> 无线电爱好者协会 — 挖掘潜质，就在无协！
