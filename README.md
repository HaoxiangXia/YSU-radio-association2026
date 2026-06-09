# 📻 无线电爱好者协会信息展示系统

> 燕山大学无线电爱好者协会（无协）官方信息展示与招新管理系统

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 项目简介

本项目是燕山大学**无线电爱好者协会**（成立于 1988 年）的官方信息展示与招新管理系统。系统提供协会风采展示、部门介绍、竞赛培训记录、在线报名、管理员后台等功能，旨在为协会提供一个集宣传与管理于一体的信息化平台。

### 协会简介

- **协会全称**：燕山大学无线电爱好者协会
- **成立年份**：1988 年
- **协会口号**：无协天下，天下无协
- **协会宗旨**：挖掘潜质，就在无协

---

## 🏗️ 技术架构

```
┌──────────────────────────────────────────────┐
│                   前端 (Frontend)              │
│         纯 HTML / CSS / JavaScript            │
│   index.html | departments.html | ...         │
└──────────────────┬───────────────────────────┘
                   │ HTTP / REST API
┌──────────────────▼───────────────────────────┐
│               后端 (Backend)                   │
│            Node.js + Express 4.18             │
│  routes/  models/  config/  scripts/          │
└──────────────────┬───────────────────────────┘
                   │ Mongoose ODM
┌──────────────────▼───────────────────────────┐
│             数据库 (Database)                  │
│               MongoDB 8.0                     │
└──────────────────────────────────────────────┘
```

| 层级 | 技术选型 |
|------|----------|
| 前端 | HTML5 + CSS3 + 原生 JavaScript |
| 后端 | Node.js + Express 4.18 |
| 数据库 | MongoDB 8.0（Mongoose ODM） |
| 认证 | JWT（JSON Web Token）+ bcrypt |
| 导出 | xlsx（Excel 读写） |

---

## ✨ 功能特性

### 对外展示（访客）

- 🏠 **首页** — 协会概况、口号、荣誉、统计数据一览
- 🏢 **部门介绍** — 五大部门（组织部、嵌入式部、机械部、计算机部、团支部）详细介绍
- 🏆 **竞赛活动** — 历年竞赛记录（展望杯、DIY达人赛、指尖风暴大赛）
- 📚 **培训记录** — 线下培训、专业知识授课、焊接实训等
- 🎖️ **荣誉墙** — 省级/校级荣誉展示
- 🎉 **社团活动** — 休闲娱乐活动展示
- 📝 **在线报名** — 新生在线填写报名表单提交
- ✅ **录取查询** — 通过学号查询录取结果

### 后台管理（管理员）

- 🔐 **管理员登录** — JWT 认证，支持"记住我"（7天免登录）
- 📋 **报名管理** — 查看所有报名信息，支持分页、搜索、排序、筛选
- 📊 **数据导出** — 将 Excel 录取名单导出为 JSON 供前端查询

---

## 📁 项目结构

```
radio---association-master/
├── package.json                  # 项目配置与依赖
├── .env                          # 环境变量（MongoDB URI、JWT密钥等）
├── server/                       # 后端服务
│   ├── app.js                    # Express 应用入口
│   ├── initDB.js                 # 数据库初始化脚本
│   ├── config/
│   │   └── db.js                 # MongoDB 连接配置
│   ├── models/                   # Mongoose 数据模型
│   │   ├── Association.js        # 协会信息模型
│   │   ├── Department.js         # 部门模型
│   │   ├── Competition.js        # 竞赛模型
│   │   ├── Honor.js              # 荣誉模型
│   │   ├── Training.js           # 培训模型
│   │   └── Registration.js       # 报名信息模型
│   └── routes/                   # API 路由
│       ├── admin.js              # 管理员认证路由
│       ├── association.js        # 协会信息路由
│       ├── competitions.js       # 竞赛路由
│       ├── departments.js        # 部门路由
│       ├── honors.js             # 荣誉路由
│       ├── registration.js       # 报名路由
│       └── trainings.js          # 培训路由
├── public/                       # 前端静态资源
│   ├── index.html                # 首页
│   ├── departments.html          # 部门介绍
│   ├── competition-activities.html # 竞赛活动
│   ├── trainings.html            # 培训记录
│   ├── honors.html               # 荣誉墙
│   ├── recreational-activities.html # 社团活动
│   ├── registration.html         # 在线报名
│   ├── registration-info.html    # 报名信息查询
│   ├── admission.html            # 录取查询
│   ├── admin-login.html          # 管理员登录
│   ├── activities.html           # 活动详情
│   ├── checkTrainings.js         # 培训数据查询脚本
│   ├── data/
│   │   └── admissions.json       # 录取名单（由导出脚本生成）
│   └── image/                    # 图片资源
└── scripts/
    └── export-admissions.js      # Excel → JSON 导出工具
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.x
- **MongoDB** >= 6.x（本地或远程实例）

### 1. 克隆项目

```bash
git clone <repository-url>
cd radio---association-master
```

### 2. 安装依赖

```bash
bun install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/radio-association
JWT_SECRET=your-secret-key-change-in-production
```

### 4. 初始化数据库

```bash
node server/initDB.js
```

执行成功后会输出 `Database initialized successfully!`，初始化协会、部门、竞赛、荣誉、培训等基础数据。

### 5. 启动服务

```bash
# 开发模式（热重载）
bun run dev

# 生产模式
bun start
```

服务默认运行在 `http://localhost:5000`

### 6. 导出录取名单（可选）

```bash
bun run export:admissions
```

该命令读取 `工作簿1.xlsx` 中的录取数据，生成 `public/data/admissions.json` 供前端录取查询使用。

---

## 🔌 API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/association` | 获取协会基本信息 |
| GET | `/api/departments` | 获取所有部门 |
| GET | `/api/competitions` | 获取竞赛列表（按年份倒序） |
| GET | `/api/trainings` | 获取培训记录 |
| GET | `/api/honors` | 获取荣誉列表 |
| POST | `/api/registration` | 提交报名信息 |

### 管理员接口（需 JWT 认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| POST | `/api/admin/logout` | 管理员注销 |
| GET | `/api/admin/verify` | 验证 Token 有效性 |
| GET | `/api/admin/profile` | 获取管理员信息 |
| GET | `/api/registration` | 获取报名列表（分页/搜索/排序） |

---

## 📊 数据模型

### Registration（报名信息）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | String | ✅ | 姓名 |
| studentId | String | ✅ | 学号 |
| college | String | ✅ | 学院 |
| grade | String | ✅ | 年级 |
| phone | String | ✅ | 手机号 |
| email | String | ✅ | 邮箱 |
| experience | String | ✅ | 相关经历 |
| expectation | String | ❌ | 期望方向 |
| createdAt | Date | 自动 | 报名时间 |

---

## 🛠️ 脚本说明

| 脚本 | 命令 | 说明 |
|------|------|------|
| `start` | `npm start` | 启动生产服务器 |
| `dev` | `npm run dev` | 启动开发服务器（nodemon 热重载） |
| `export:admissions` | `npm run export:admissions` | 将 Excel 录取名单导出为 JSON |

---

## 🔒 安全说明

- 管理员密码使用 **bcrypt** 加密存储
- API 认证使用 **JWT** 令牌机制
- 管理员登录支持过期时间控制（24h / 7天）
- 报名管理接口需要 Bearer Token 认证
- 生产环境请务必修改 `.env` 中的 `JWT_SECRET` 和默认管理员密码

---

## 📄 License

MIT License

---

> 💡 **无线电爱好者协会** — 挖掘潜质，就在无协！
