# 开发指南

面向开发者的环境搭建与日常开发说明。新人先看 [README](../README.md) 跑通项目再回来查细节。

## 环境要求

- **Python** >= 3.11
- **uv**（https://docs.astral.sh/uv/getting-started/installation/）
- **Bun**（运行项目脚本、前端构建、E2E 测试）

首次安装：

```bash
cd backend && uv sync        # Python 依赖
bun install                  # 根目录脚本依赖
bun install --cwd frontend   # Astro 前端依赖
```

## 环境变量

在项目根目录从 `.env.example` 复制 `.env`（不提交）：

```env
PORT=5000
JWT_SECRET="your-secret-key-change-in-production"
OFFICER_USERNAME=example-officer
OFFICER_PASSWORD=example-password
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | 服务端口号，默认 `5000` |
| `DATABASE_PATH` | 否 | SQLite 数据库路径，相对路径基于仓库根目录，默认 `backend/data/database.sqlite` |
| `JWT_SECRET` | **是** | JWT 签名密钥，生产环境必须为随机长字符串。未设置时启动失败。 |
| `OFFICER_USERNAME` | **是** | 招新负责人登录用户名（仅一个账号）。未设置时启动失败。 |
| `OFFICER_PASSWORD` | **是** | 招新负责人登录密码（明文）。未设置时启动失败。 |
| `RECRUITMENT_CONFIG_PATH` | 否 | 私有招新配置路径；生产为 `/var/lib/radio-association/private/recruitment.json` |
| `ADMISSIONS_DATA_PATH` | 否 | 私有录取名单路径；生产为 `/var/lib/radio-association/private/admissions.json` |

> **安全**：三个必填变量无硬编码默认值，未设置直接拒绝启动。`.env` 不得提交，服务器上文件权限受控。

## 启动

两个进程分开跑，各占一个终端：

```bash
# 终端 1：后端（5000，服务 public/ 静态产物 + API）
bun run dev

# 终端 2：Astro 前端开发服务器（4321，热更；仅在改 frontend/ 时需要）
bun run dev:frontend
```

- 后端 `http://localhost:5000`，根路径自动跳转 `/html/index.html`
- Astro dev `http://localhost:4321`，`/api`、`/image`、`/data`、未在 bypass 白名单的 `/html/*` 均代理到 5000；Astro 自己的页面路由在 `astro.config.mjs` 的 `bypass()` 里逐个登记

## 招新配置（本地开发）

本地招新配置放 `backend/config/recruitment.local.json`（git 已排除）；不存在时回退 `recruitment.example.json`（默认关闭申请与查询）。优先级：`RECRUITMENT_CONFIG_PATH` > `recruitment.local.json` > `recruitment.example.json`。

**改文件不热生效**：配置只在启动时加载并缓存。`uvicorn --reload` 不监听 JSON——改完重启后端。不想重启：登录负责人后台在"招新设置与录取结果"保存，写盘同时刷新内存。

`admissionQuery.enabled=true` 时启动强制加载录取名单（默认在仓库旁的 `YSU-radio-association-private/admission-results.json`），缺失会拒绝启动；本地无名单可放空数组 `[]` 占位。

生产不用 `recruitment.local.json`：日常变更由负责人在网页后台保存（实时生效+自动备份），仅后台不可用时按 [Docker 部署方案](DOCKER_DEPLOYMENT.md) 8.5 节手动替换。

## Astro 前端工程

9 个页面由 `frontend/` 构建（产物提交进 `public/html/`）：index、about-association、activities、competition-activities、recreational-activities、honors、trainings、recruitment-operations、recruitment-questions。其余 4 个页面（membership-application、membership-applications、admission、admin-login）是 `public/html/` 下的原生 HTML，直接编辑。

```bash
bun run dev:frontend    # 开发（需后端已在 5000）
bun run build:frontend  # 构建并覆盖 public/html/ 与 public/_astro/
```

**改 `frontend/src/` 后必须重新构建并一并提交产物**（本仓库源码+产物同库，服务器拉代码即部署）。

### 招新题组页（recruitment-questions）

内容在 `frontend/src/content/questions/`：

- 每套题一个 md 文件（如 `c.md`、`python.md`、`qrs.md`），支持 `$...$`/`$$...$$` KaTeX 公式与 GFM
- 图片放 `images/` 子目录，md 里相对路径引用（构建期自动压缩为 webp）
- 接入新题组：在 `recruitment-questions.astro` 加 `getEntry` + tab 按钮（去掉占位的 `disabled`/`--placeholder`），并在 `public/html/recruitment-questions.js` 的 `names` 数组登记 id

### 布局与导航

- 公共布局 `frontend/src/layouts/SubpageLayout.astro`：默认渲染全局导航（`common.js` 注入）；页面传 `navMode="custom"` 并提供 `slot="nav"` 可自定义页内导航（题组页即此模式）
- 严格 CSP（`style-src 'self'`，无 `unsafe-inline`）：astro 里的 `<style is:global>` 构建为外链 css，脚本必须外链文件（`public/html/*.js`），禁止内联

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `bun run dev` | 后端开发（uvicorn --reload，5000） |
| `bun run dev:frontend` | Astro 开发服务器（4321） |
| `bun run build:frontend` | 构建 9 个 Astro 页面到 `public/` |
| `bun run images:build` | 从 `source-assets/image-originals` 生成响应式 WebP 与清单 |
| `bun scripts/init-db.js` | 重建本地种子数据（破坏性，仅限本地） |
| `bun run verify` | 敏感文件 + 源文件 + Python + API 检查 |
| `bun run verify:release` | verify + 桌面/320px/390px E2E |

发布、备份、回滚见 [部署与运维速查](OPERATIONS_QUICK_REFERENCE.md)。

## 本地种子数据（可选）

```bash
bun scripts/init-db.js
```

先清空再插入协会、部门、竞赛、荣誉、培训等基础数据。破坏性操作，仅限明确需要的本地环境；生产与故障排查不得运行。
