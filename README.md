# 无线电爱好者协会信息展示系统

> 当前开发主线是 `dev`，应跟踪 `origin/dev`；`master` 仅作为归档分支，`lucian` 保留旧 Bun/Express 实现与迁移历史，请勿继续在二者上开发或直接合并。

> 燕山大学无线电爱好者协会（无协）官方信息展示与招新管理系统

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat&logo=astro&logoColor=white)](https://astro.build/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org/)

---

## 项目简介

燕山大学无线电爱好者协会（成立于 1988）的官方网站，集风采展示与招新管理于一体：对访客提供协会介绍、活动记录、题组参考与在线入会申请；对招新负责人提供申请管理、统计与录取发布后台。

### 协会简介

- **协会全称**：燕山大学无线电爱好者协会
- **成立年份**：1988 年
- **协会口号**：无协天下，天下无协
- **协会宗旨**：挖掘潜质，就在无协

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
- **招新题组** — 各部门招新参考题组（计算机部 C 语言/Python、嵌入式部面试题），支持数学公式与代码高亮
- **在线入会申请** — 新生在线填写入会申请表单提交
- **录取查询** — 通过学号和手机号匹配查询录取结果

### 后台管理（招新负责人）

- **登录** — JWT 认证，支持"记住我"
- **入会申请管理** — 查看所有申请，支持分页、搜索、筛选，近七日趋势与学院分布图表
- **数据导出** — 将入会申请导出为 CSV
- **招新设置** — 编辑开放时间、通知、隐私告知、联系方式和表单选项
- **录取结果** — 下载模板、上传 Excel、校验、脱敏预览并确认发布

---

## 技术架构

```
┌──────────────────────────────────────────────┐
│              前端 (Frontend)                  │
│   Astro 构建的静态页 + 原生 HTML/CSS/JS       │
│        产物位于 public/html/                 │
└──────────────────┬───────────────────────────┘
                   │ HTTP / REST API
┌──────────────────▼───────────────────────────┐
│              后端 (Backend)                   │
│          FastAPI + Python 3.11+              │
│   backend/routes/  backend/models/           │
└──────────────────┬───────────────────────────┘
                   │ sqlite3 (Python stdlib)
┌──────────────────▼───────────────────────────┐
│             数据库 (Database)                 │
│               SQLite 3                        │
│      backend/data/database.sqlite            │
└──────────────────────────────────────────────┘
```

| 层级 | 技术选型 |
|------|----------|
| 前端 | Astro 7（静态构建） + HTML5 + CSS3 + 原生 JavaScript |
| 后端 | FastAPI + Python 3.11+ |
| 依赖管理 | uv（Python） / Bun（脚本与前端） |
| 数据库 | SQLite 3（Python 标准库 `sqlite3`） |
| 认证 | JWT（PyJWT） |
| 安全防护 | 登录/提交速率限制、严格 CSP、参数化查询 |
| 导出与导入 | CSV 导出、负责人网页 Excel 校验/脱敏预览/录取名单发布 |

---

## 快速开始

### 环境要求

- **Python** >= 3.11
- **uv**（https://docs.astral.sh/uv/getting-started/installation/）
- **Bun**（https://bun.sh/）

### 跑起来

```bash
# 1. 安装依赖
cd backend && uv sync && cd ..
bun install

# 2. 配置环境变量（从示例复制，三个必填项见 docs/DEVELOPMENT.md）
cp .env.example .env

# 3. 启动后端（5000 端口，同时服务静态页面与 API）
bun run dev
```

访问 `http://localhost:5000`，自动跳转到首页。

到此即可浏览所有页面与使用 API。**只有修改 `frontend/` 下的 Astro 源码时**才需要另开一个终端跑 `bun run dev:frontend`（4321 端口热更新），详见开发指南。

---

## 项目结构

```
radio-association/
├── package.json                  # 开发、验证、图片和导出脚本
├── .env.example                  # 本地环境变量示例
├── docs/                         # 文档与决策记录
├── frontend/                     # Astro 工程（9 个页面源码 + 招新题组内容集合）
├── backend/                      # FastAPI 后端
│   ├── app.py                    # 应用入口
│   ├── config/                   # 数据库与招新配置
│   ├── models/                   # SQLite 数据访问
│   ├── routes/                   # FastAPI 路由
│   ├── tests/                    # API、运维和部署工具测试
│   └── data/                     # 本地 SQLite 数据（不提交）
├── public/                       # 前端静态资源（含 Astro 构建产物，随同提交）
│   ├── html/                     # 页面、样式、脚本
│   └── image/                    # 会徽与生成的响应式 WebP
├── source-assets/                # 图片原稿（不进 git archive）
├── deployment/                   # Caddy、systemd 与运维配置
├── scripts/                      # 图片、导出、检查与运维工具
└── tests/                        # Playwright E2E 与测试夹具
```

---

## 文档入口

**日常使用**
- 招新负责人：[招新日常运行说明](docs/RECRUITMENT_OPERATIONS.md)；录取名单 Excel 操作见[大白话流程说明](docs/录取名单Excel发布流程说明.md)
- 正式开放招新前：完成[个人信息保护上线确认表](docs/PRIVACY_IMPACT_CHECKLIST.md)

**开发与部署**
- 开发者环境、Astro 工程、题组页编辑、脚本：[开发指南](docs/DEVELOPMENT.md)
- 部署：[Docker + Caddy 部署方案](docs/DOCKER_DEPLOYMENT.md)；日常维护：[部署与运维速查](docs/OPERATIONS_QUICK_REFERENCE.md)
- 架构理解：[部署与运维架构](docs/DEPLOYMENT_AND_OPERATIONS.md)；数据结构：[数据库说明](docs/DATABASE.md)；命名决策：`docs/adr/`

**压测**
- [入会申请接口隔离压测说明](docs/LOAD_TESTING.md)；2026-08-12 实测：[500 并发隔离压测报告](docs/LOAD_TESTING_REPORT_2026-08-12.md)

---

## 安全说明

- 招新负责人密码以明文配置在环境变量 `OFFICER_PASSWORD` 中，仅保存在服务器受限配置文件
- `JWT_SECRET`、`OFFICER_USERNAME`、`OFFICER_PASSWORD` 无硬编码默认值，未设置时应用拒绝启动
- API 认证使用 JWT；管理接口需 Bearer Token
- 登录、入会申请和录取查询均有内存速率限制；生产固定单 Uvicorn 进程，与 SQLite 单进程设计一致
- 入会申请需确认个人信息处理说明；确认值只用于提交校验，不写入业务表
- 生产必须使用随机 `JWT_SECRET`，全站严格 CSP（无 `unsafe-inline`）

---

> 无线电爱好者协会 — 挖掘潜质，就在无协！
