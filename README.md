# 无线电爱好者协会信息展示系统

> 当前招新网站开发分支是 `lucian`；`master` 仅保留上一年度归档版本，`dev` 为独立的 FastAPI 重构尝试，请勿直接合并或基于 `master` 开发。

> 燕山大学无线电爱好者协会（无协）官方信息展示与招新管理系统

[![Bun](https://img.shields.io/badge/Bun-1.3+-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 项目简介

本项目是燕山大学无线电爱好者协会（成立于 1988 年）的官方信息展示与招新管理系统。系统提供协会风采展示、关于协会、竞赛培训记录、在线报名、管理员后台等功能，旨在为协会提供一个集宣传与管理于一体的信息化平台。

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
│            Bun + Express 4.18                 │
│  routes/  models/  config/  scripts/          │
└──────────────────┬───────────────────────────┘
                   │ bun:sqlite
┌──────────────────▼───────────────────────────┐
│             数据库 (Database)                  │
│               SQLite 3                        │
│         server/data/database.sqlite           │
└──────────────────────────────────────────────┘
```

| 层级 | 技术选型 |
|------|----------|
| 前端 | HTML5 + CSS3 + 原生 JavaScript |
| 后端 | Bun + Express 4.18 |
| 数据库 | SQLite 3（bun:sqlite） |
| 认证 | JWT（JSON Web Token）+ bcrypt |
| 导出 | CSV（由后端接口生成并下载） |

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
- **在线报名** — 新生在线填写报名表单提交
- **录取查询** — 通过学号查询录取结果

### 后台管理（管理员）

- **管理员登录** — JWT 认证，支持“记住我”
- **报名管理** — 查看所有报名信息，支持分页、搜索、筛选
- **数据导出** — 将报名信息导出为 CSV

---

## 项目结构

```
YSU-radio-association2026/
├── package.json                  # 项目配置与依赖
├── .env                          # 环境变量（端口号、JWT 密钥等）
├── README.md                     # 项目说明
├── server/                       # 后端服务
│   ├── app.js                    # Express 应用入口
│   ├── initDB.js                 # 数据库初始化脚本
│   ├── config/
│   │   └── database.js           # SQLite 连接配置
│   ├── models/                   # 数据模型
│   │   ├── Association.js        # 协会信息模型
│   │   ├── Competition.js        # 竞赛模型
│   │   ├── Department.js         # 部门模型
│   │   ├── Honor.js              # 荣誉模型
│   │   ├── Registration.js       # 报名信息模型
│   │   └── Training.js           # 培训模型
│   ├── routes/                   # API 路由
│   │   ├── admin.js              # 管理员认证路由
│   │   ├── association.js        # 协会信息路由
│   │   ├── competitions.js       # 竞赛路由
│   │   ├── departments.js        # 部门路由
│   │   ├── honors.js             # 荣誉路由
│   │   ├── registration.js       # 报名路由
│   │   └── trainings.js          # 培训路由
│   └── data/                     # SQLite 数据库目录
│       └── database.sqlite
├── public/                       # 前端静态资源
│   ├── html/                     # 纯 HTML 页面
│   │   ├── index.html            # 首页（固定落地页）
│   │   ├── about-association.html # 关于协会（协会概况 + 部门介绍）
│   │   ├── activities.html       # 协会活动总入口
│   │   ├── competition-activities.html # 竞赛活动
│   │   ├── recreational-activities.html # 文娱活动
│   │   ├── honors.html           # 荣誉墙
│   │   ├── trainings.html        # 培训记录
│   │   ├── registration.html     # 在线报名
│   │   ├── registration-info.html # 报名管理（需登录）
│   │   ├── admission.html        # 录取查询
│   │   ├── admin-login.html      # 管理员登录
│   │   ├── styles.css            # 公共样式
│   │   ├── common.js             # 公共脚本（导航、页脚、交互）
│   │   ├── data.js               # 静态数据
│   │   └── home-effects.js       # 首页粒子背景动画
│   ├── image/                    # 图片与视频资源
│   └── favicon.ico               # 网站图标
├── backup/                       # 备份目录
│   └── vue-source/               # 原 Vue 源码备份
└── scripts/
    └── export-admissions.js      # Excel → JSON 导出工具
```

---

## 快速开始

### 环境要求

- **Bun** >= 1.3.x

### 1. 克隆项目

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. 安装依赖

```bash
bun install
```

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | 服务端口号，默认 `5000` |
| `DATABASE_PATH` | 否 | SQLite 数据库路径，默认 `server/data/database.sqlite` |
| `ADMIN_USERNAME` | 是 | 唯一管理员账号 |
| `ADMIN_PASSWORD_HASH` | 是 | 管理员密码的 bcrypt 哈希 |
| `JWT_SECRET` | 是 | 足够长的 JWT 签名密钥 |
| `REGISTRATION_OPEN` | 是 | 是否允许报名；正式开放前保持 `false` |
| `REGISTRATION_START` / `REGISTRATION_END` | 是 | 使用带时区 ISO 格式的报名起止时间 |

在项目根目录从示例复制 `.env`（此文件不会提交）：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，填写管理员账号、bcrypt 密码哈希和 JWT 密钥。生成密码哈希、报名开关、数据库备份与测试数据清理步骤见 [招新运行说明](docs/RECRUITMENT_OPERATIONS.md)。数据库会在服务首次启动时自动创建。

### 4. 启动服务

```bash
bun server/app.js
```

服务默认运行在 `http://localhost:5000`，访问根路径会自动跳转到 `http://localhost:5000/html/index.html`。

### 5. 导出录取名单（可选）

```bash
bun scripts/export-admissions.js
```

该命令读取 `工作簿1.xlsx` 中的录取数据，生成 `public/data/admissions.json` 供前端录取查询使用。

---

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/departments` | 获取所有部门 |
| GET | `/api/competitions` | 获取竞赛列表（按年份倒序） |
| GET | `/api/trainings` | 获取培训记录 |
| GET | `/api/honors` | 获取荣誉列表 |
| GET | `/api/registration/status` | 获取当前报名开放状态和时间窗 |
| POST | `/api/registration` | 提交报名信息 |

### 管理员接口（需 JWT 认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| POST | `/api/admin/logout` | 管理员注销 |
| GET | `/api/admin/verify` | 验证 Token 有效性 |
| GET | `/api/admin/profile` | 获取管理员信息 |
| GET | `/api/registration` | 获取报名列表（分页/搜索/排序） |
| GET | `/api/registration/options` | 获取筛选选项 |
| GET | `/api/registration/stats` | 获取报名统计 |
| GET | `/api/registration/export` | 导出当前筛选结果为 CSV |
| DELETE | `/api/registration/:id` | 删除指定报名记录 |

---

## 数据模型

### Registration（报名信息）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | String | 是 | 姓名 |
| studentId | String | 是 | 学号 |
| college | String | 是 | 学院 |
| grade | String | 是 | 年级 |
| phone | String | 是 | 手机号 |
| email | String | 是 | 邮箱 |
| experience | String | 是 | 相关经历 |
| expectation | String | 否 | 期望方向 |
| createdAt | DateTime | 自动 | 报名时间 |

---

## 脚本说明

| 脚本 | 命令 | 说明 |
|------|------|------|
| start | `bun server/app.js` | 启动生产服务器 |
| export:admissions | `bun scripts/export-admissions.js` | 将 Excel 录取名单导出为 JSON |
| clear-test-registrations | `bun server/scripts/clear-test-registrations.js` | 仅在非生产环境清空测试报名 |

---

## 安全说明

- 管理员密码使用 bcrypt 加密存储
- API 认证使用 JWT 令牌机制
- 报名管理接口需要 Bearer Token 认证
- 没有公开默认管理员账号、密码或 JWT 密钥；未配置 `.env` 时后台会拒绝登录
- 报名接口会在服务端校验时间窗、字段格式、重复学号和提交频率
- 正式上线前保持数据库备份，并确认 `REGISTRATION_OPEN` 与报名时间窗

---

## License

MIT License

---

> 无线电爱好者协会 — 挖掘潜质，就在无协！
