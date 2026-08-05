# 迁移计划：systemd + radioctl → Docker

**执行者须知**：本计划交给服务器上的 AI 代理执行。执行前完整阅读；每完成一个阶段立即验证，验证失败执行对应回退步骤，不要带病推进。所有命令在 root shell（`su -` 后）执行。

**重要**：本文第 10 节列出了作者在编写时无法确认的开放问题。执行者必须在服务器上逐项实测并得出结论，再按结论调整后续步骤。不要假设，要验证。

## 0. 背景与目标

- 服务器：腾讯云香港轻量，Ubuntu 24.04，2 vCPU / 2 GB 内存 / 2 GB swap。
- 当前架构：systemd 运行单 Uvicorn 进程（`radio-association.service`），代码在 `/opt/radio-association/releases/<SHA>`，`current` 软链指向当前版本；宿主机 Nginx 反代 `127.0.0.1:5000` 并提供 80/443。
- 目标架构：**仅容器化 FastAPI 应用**。Nginx、certbot、防火墙、备份 timer 保持在宿主机不变。容器绑定 `127.0.0.1:5000`，公网入口不变。
- 数据与配置零改动：容器内挂载路径与宿主机相同，环境变量原样注入。

### 非目标（明确禁止）

- 不改 Nginx、certbot、防火墙、腾讯云控制台配置。
- 不迁移 Nginx 或数据库进容器（SQLite 是嵌入式文件，无需容器化）。
- 不删除 `/opt/radio-association/`、systemd unit 文件、`radioctl`——它们是回退保障，观察期结束后另行清理。
- 不运行 `scripts/init-db.js`，不用 `cp` 复制活跃 SQLite/WAL/SHM 文件。
- 不向公网开放 5000/8080。

## 1. 迁移前盘点（只读）

依次执行并记录输出，作为迁移前基线：

```bash
uname -m                                       # 确认架构（预期 x86_64 或 aarch64，影响镜像构建）
docker --version 2>/dev/null || echo "docker 未安装"
radioctl status                                # 记录 current SHA、健康状态、备份状态
systemctl is-active radio-association nginx    # 预期均为 active
id radio-association                           # 记录 UID:GID，容器将以该身份运行
ls -l /var/lib/radio-association/data /var/lib/radio-association/private /var/lib/radio-association/state
grep -oE '^[A-Z_]+' /etc/radio-association/app.env   # 只列出键名，不输出值
df -h /                                        # 确认磁盘余量 >= 3 GB（镜像约 200-400 MB）
free -h                                        # 确认内存基线
```

**通过条件**：`radioctl status` 健康、最近备份未超 30 小时、`/var/lib/radio-association/` 下数据库与两个私有 JSON 均存在。

然后创建迁移前手动备份：

```bash
radioctl backup
ls -lh /var/backups/radio-association/         # 确认新备份生成
```

## 2. 架构决策（已确定，直接执行）

| 决策 | 选择 | 理由 |
|---|---|---|
| 容器编排 | Docker Compose v2（`docker compose`） | 单容器，无需 swarm/k8s；compose 文件即文档 |
| 镜像构建 | 在服务器本地 `docker build` | 依赖均为纯 Python（fastapi/uvicorn/pydantic/pyjwt），2 GB 内存可承受；免去跨架构和 registry 网络问题 |
| 镜像 tag | `radio-association:<40位SHA>` | 与现有"精确版本发布"模型一致，回滚=换 tag |
| 数据挂载 | `/var/lib/radio-association` 同路径 bind mount | 应用通过 `DATABASE_PATH` 等环境变量定位文件，同路径挂载后配置零改动；宿主机备份脚本继续可见数据 |
| 环境变量 | compose `env_file: /etc/radio-association/app.env` | 应用 `load_dotenv(override=False)`，环境变量优先，行为与 systemd `EnvironmentFile` 一致 |
| 容器运行身份 | `user: "<radio-association的UID>:<GID>"` | 保持宿主机文件属主不变，宿主机备份/恢复操作不受影响 |
| 端口 | `127.0.0.1:5000:5000` | 只绑回环，Nginx 配置不动 |
| 备份 | 保留 `radio-association-backup.timer` → `radioctl backup` 不变 | `radioctl backup` 只操作数据库文件，不依赖应用服务 |
| 恢复/发布/回滚 | 弃用 `radioctl deploy/rollback/restore/configure/admissions`，改用第 7 节新流程 | 这些子命令会 `systemctl restart radio-association.service`，迁移后无效 |

## 3. 阶段一：安装 Docker

首选 Ubuntu 官方仓库（无需配置第三方源）：

```bash
apt-get update
apt-get install -y docker.io docker-compose-v2
systemctl enable --now docker
docker version && docker compose version
```

若 `docker-compose-v2` 包不存在（见第 10 节 Q2），改用 `apt-cache search compose` 找到的实际包名，或按 Docker 官方文档安装 `docker-ce` + `docker-compose-plugin`。

**验证**：两个 version 命令均正常输出版本号。
**回退**：本阶段无状态，`apt-get remove docker.io docker-compose-v2` 即可。

## 4. 阶段二：准备镜像与编排文件

### 4.1 获取源码（git clone 方案）

与旧发布模型不同，迁移后在服务器上维护一个**专用 git 克隆**作为构建上下文。Dockerfile 和 compose.yaml 已提交在仓库 `deployment/docker/` 下，无需在服务器手工创建。

```bash
mkdir -p /opt/radio-association/docker
git clone https://github.com/HaoxiangXia/YSU-radio-association2026.git /opt/radio-association/docker/src   # 公开仓库，无需凭据
cd /opt/radio-association/docker/src
git checkout <40位SHA>
[[ "$(git rev-parse HEAD)" == "<40位SHA>" ]] || { echo "HEAD 与目标 SHA 不符，终止"; exit 1; }
```

完整性保障与旧归档方案等价：`git rev-parse HEAD` 核对确保构建的就是目标 commit，不依赖分支名。此克隆只用于构建，**禁止**在其中 `git pull` 后直接构建未核对 SHA 的代码；每次发布都必须显式 checkout + 核对。

执行者需将 `https://github.com/HaoxiangXia/YSU-radio-association2026.git` 替换为实际 GitHub 地址，并先实测可达性：`git ls-remote https://github.com/HaoxiangXia/YSU-radio-association2026.git`。若服务器访问 GitHub 不稳定，按第 10 节 Q11 的离线方案兜底。

后续发布无需重新 clone，见第 7.1 节。

### 4.2 Dockerfile 与 compose 文件

两者已在仓库中，clone 后即存在，**不要**在服务器手工另写：

- `deployment/docker/Dockerfile`：`python:3.11-slim` 基础镜像，`uv sync --frozen --no-dev` 装锁定依赖，含 `/healthz` HEALTHCHECK，构建上下文为仓库根目录。
- `deployment/docker/compose.yaml`：镜像 tag 由 `RADIO_SHA` 锚定；`user:` 固定为宿主机 `radio-association` 的 UID:GID；`env_file` 注入 `/etc/radio-association/app.env`；`/var/lib/radio-association` 同路径挂载；只绑 `127.0.0.1:5000`；内存上限 512 MB；日志轮转 10 MB × 3。

只需在 compose 文件旁创建版本/身份锚点 `.env`（git 未跟踪，checkout 切换版本不影响）：

```bash
cd /opt/radio-association/docker/src/deployment/docker
{
  printf 'RADIO_SHA=%s\n' '<40位SHA>'
  printf 'APP_UID=%s\n' "$(id -u radio-association)"
  printf 'APP_GID=%s\n' "$(id -g radio-association)"
} > .env
cat .env   # 确认三个值均非空

### 4.3 构建镜像

```bash
cd /opt/radio-association/docker/src/deployment/docker
docker compose build
docker images radio-association    # 确认出现 radio-association:<SHA>
```

**验证**：镜像构建成功且 tag 正确。构建期内存吃紧时 `free -h` 观察 swap（见第 10 节 Q5）。
**回退**：`docker compose down; docker rmi radio-association:<SHA>`，宿主机服务此时尚未动过。

## 5. 阶段三：切换（关键步骤，按序执行）

```bash
# 1. 停旧服务（容器要绑同一个 127.0.0.1:5000，必须先停）
systemctl stop radio-association.service
systemctl disable radio-association.service     # disable 而非 mask，保留回退能力

# 2. 启动容器
cd /opt/radio-association/docker/src/deployment/docker
docker compose up -d

# 3. 健康检查（最多等 30 秒）
sleep 5
curl --fail http://127.0.0.1:5000/healthz && echo
curl --fail http://127.0.0.1:5000/ops/backupz && echo
docker ps --filter name=radio-association       # STATUS 应变为 healthy
ss -ltnp | grep -E ':(80|443|5000)\b'           # 5000 只监听 127.0.0.1

# 4. 公网冒烟
curl -fsSI https://wuxie.luciangray.net/ | head -3
```

**切换失败的即时回退**（健康检查不过或页面异常）：

```bash
cd /opt/radio-association/docker && docker compose down
systemctl enable --now radio-association.service
radioctl status     # 确认回到迁移前状态
```

回退成功后再排查容器问题（先看 `docker logs radio-association`），不要在故障状态下继续改造。

## 6. 阶段四：迁移后验证清单

全部通过才算迁移完成：

- [ ] `docker ps` 中容器 `healthy`，`docker logs radio-association --tail 50` 无异常
- [ ] `https://wuxie.luciangray.net` 首页、入会申请页、录取查询页、负责人登录页可访问（HTTPS）
- [ ] `curl -s http://127.0.0.1:5000/ops/backupz` 返回正常且最近备份未超 30 小时
- [ ] `systemctl list-timers radio-association-backup.timer certbot.timer` 均有下次执行时间
- [ ] `ss -ltnp`：公网仅 22/80/443，5000 仅 `127.0.0.1`
- [ ] 公网访问 `https://wuxie.luciangray.net/ops/` 返回 404
- [ ] 网页后台登录正常，能看到既有入会申请记录（证明数据库挂载正确）
- [ ] `free -h`：容器稳定后总内存占用与迁移前相比增幅 < 400 MB
- [ ] 手动 `radioctl backup` 成功，新备份出现在 `/var/backups/radio-association/`
- [ ] 重启容器验证自恢复：`docker restart radio-association`，30 秒内 `/healthz` 恢复
- [ ] **容器写入属主验证**：在网页后台做一次不提交的测试操作或触发一次应用内写（如查看后台触发配置读取不算，需真实写入），然后 `ls -l /var/lib/radio-association/data/`，确认新产生的 `-wal` 文件属主仍是 `radio-association` 而非 root（见第 10 节 Q4）

## 7. 迁移后的日常运维命令（替代旧 radioctl 流程）

以下写入运维文档，替代 `radioctl deploy/rollback/restore/configure/admissions`。`radioctl backup` 仍然有效；`radioctl status` 中 `systemctl status` 一段迁移后无意义，以第 7.5 节为准。

### 7.1 发布新版本

上游提供归档、40 位 SHA、SHA-256 后：

```bash
cd /opt/radio-association/docker/src
radioctl backup                                                  # 发布前备份（保留该习惯）
git fetch origin
git checkout <新SHA>
[[ "$(git rev-parse HEAD)" == "<新SHA>" ]] || { echo "HEAD 与目标 SHA 不符，终止"; exit 1; }
cd deployment/docker
sed -i 's/^RADIO_SHA=.*/RADIO_SHA=<新SHA>/' .env
docker compose up -d --build
sleep 5 && curl --fail http://127.0.0.1:5000/healthz             # 失败则执行 7.2 回滚
```

### 7.2 回滚

```bash
cd /opt/radio-association/docker/src/deployment/docker
radioctl backup
sed -i 's/^RADIO_SHA=.*/RADIO_SHA=<旧SHA>/' .env                 # 旧镜像仍在本地，无需重新构建
docker compose up -d
sleep 5 && curl --fail http://127.0.0.1:5000/healthz
```

### 7.3 数据库恢复（替代 radioctl restore）

```bash
cd /opt/radio-association/docker/src/deployment/docker
docker compose stop                                              # 必须先停容器，WAL 模式下不能热替换
radioctl restore /var/backups/radio-association/<准确文件名>.sqlite --confirm
docker compose start
sleep 5 && curl --fail http://127.0.0.1:5000/healthz
```

注意：`radioctl restore` 内部的 `systemctl stop radio-association.service` 对已禁用服务是 no-op（返回成功），不影响执行；但执行者必须先自行验证这一点（见第 10 节 Q6），若验证发现 restore 中途失败，改为手动：停容器 → 用 `/usr/local/lib/radio-association/sqlite_backup.py restore <源> <目标> /var/backups/radio-association` → 修正属主 `chown radio-association:radio-association /var/lib/radio-association/data/database.sqlite && chmod 640` → 启动容器。

### 7.4 更新招新配置 / 录取名单（网页后台不可用时的应急路径）

```bash
# 校验（借用容器内的应用代码；注意 docker exec 默认以容器 user 运行，需能读 /tmp 文件，
# 可先 chmod 644 临时文件，操作完删除）
docker exec radio-association python -c \
    'from config.recruitment import load_recruitment_config; load_recruitment_config("/tmp/recruitment.json")' 2>/dev/null || \
docker exec --workdir /app/backend -e RECRUITMENT_CONFIG_PATH=/tmp/recruitment.json radio-association \
    .venv/bin/python -c 'from config.recruitment import load_recruitment_config; load_recruitment_config()'
# 原子替换 + 重启
install -o radio-association -g radio-association -m 600 /tmp/recruitment.json \
    /var/lib/radio-association/private/recruitment.json.new
mv /var/lib/radio-association/private/recruitment.json.new \
    /var/lib/radio-association/private/recruitment.json
docker restart radio-association
sleep 5 && curl --fail http://127.0.0.1:5000/healthz    # 失败：从 .previous.* 备份恢复同名文件再重启
```

录取名单同理：校验改用 `from routes.admissions import load_admissions; load_admissions("/tmp/admissions.json")`，目标路径 `/var/lib/radio-association/private/admissions.json`。

### 7.5 状态查看

```bash
docker ps --filter name=radio-association
docker logs radio-association --tail 100
curl -s http://127.0.0.1:5000/healthz && echo
curl -s http://127.0.0.1:5000/ops/backupz && echo
cat /opt/radio-association/docker/src/deployment/docker/.env        # 当前部署 SHA
```

## 8. 观察期与最终清理（>= 7 天无回退后执行）

1. 删除旧发布目录前逐个确认：`ls /opt/radio-association/releases/`；镜像已含代码，可全部删除。
2. 删除应用 unit：`rm /etc/systemd/system/radio-association.service`（**保留** `radio-association-backup.service/.timer`，备份仍走它们）→ `systemctl daemon-reload`。
3. `radioctl` 保留在 `/usr/local/sbin/`（backup/restore 仍在用）。
4. 清理悬空镜像：`docker image prune -f`；旧版本镜像保留最近 2 个 tag 供回滚。
5. 更新 `docs/DEPLOYMENT_AND_OPERATIONS.md` 与 `docs/OPERATIONS_QUICK_REFERENCE.md` 中失效的 radioctl 发布/回滚段落。

## 9. 风险与注意事项

| 风险 | 缓解 |
|---|---|
| 容器内写 SQLite 时宿主机文件属主变化 | compose 固定 `user:` 为 radio-association 的 UID:GID；阶段四最后一项验证此点 |
| `uv sync` 构建期 OOM | 依赖纯 Python，正常 < 1 GB；构建时避免其他重负载；swap 兜底 |
| 忘记停容器直接恢复数据库 | 7.3 流程强制 `docker compose stop` 在前 |
| 5000 端口暴露公网 | compose 绑定 `127.0.0.1`，验证清单含 `ss -ltnp` 检查 |
| Docker Hub 拉取 `python:3.11-slim` 失败 | 香港机房通常可达；失败时配置镜像加速器后重试（见 Q3），不要改用 full 镜像 |
| 迁移后 `radioctl status` 部分输出失效 | 属预期；以第 7.5 节命令为准 |

## 10. 开放问题（执行者必须在服务器上逐项实测）

以下是计划作者编写时**无法确认**的事项。在对应步骤前先实测，把结论记录下来，按结论调整执行：

**Q1. 服务器 CPU 架构。**
`uname -m`。若是 `aarch64`，`python:3.11-slim` 多架构镜像可正常拉取，计划不受影响；但后续若换机器重建需注意跨架构。只需记录，无需改步骤。

**Q2. `docker-compose-v2` 包在 Ubuntu 24.04 源里是否存在。**
`apt-cache policy docker-compose-v2`。不存在则用 `apt-cache search 'compose'` 找替代（可能是 `docker-compose` 或需装 Docker 官方源的 `docker-compose-plugin`）。若装了 `docker-compose`（v1），把全文 `docker compose` 命令换成 `docker-compose`，并确认其支持 `mem_limit`（v1 需 `mem_limit` 写在 service 下，语法兼容）。

**Q3. 服务器能否直连 Docker Hub。**
`docker pull hello-world` 或 `curl -sI https://registry-1.docker.io/v2/ --max-time 10`。拉不动时配置镜像加速器：写 `/etc/docker/daemon.json`（如 `{"registry-mirrors": ["https://mirror.ccs.tencentyun.com"]}`，腾讯云内网/香港节点均提供），`systemctl restart docker` 后重试。**注意 restart docker 不影响尚未创建的容器，但要在 `docker compose up` 之前做。**

**Q4. 容器以非 root UID 运行时，对挂载目录的写权限是否完整。**
compose `user:` 生效后，容器进程以宿主机 radio-association 的 UID 运行，对 `/var/lib/radio-association` 应有完整写权限（属主即它）。但需实测一个边界：`/var/lib/radio-association/state/backup-status.json` 属主是 `root:radio-association 640`（由 `radioctl backup` 设置）——容器以 radio-association **组**身份可读，应用 `/ops/backupz` 只需读，应无问题。验证方法：容器起来后直接 `curl http://127.0.0.1:5000/ops/backupz`，返回 200 即通过；若 500/权限错误，检查 compose 的 `user:` 是否写成了 `UID:GID` 两个值（只写 UID 会导致组不对）。

**Q5. 构建期内存是否够。**
`docker compose build` 期间另开会话 `watch free -h`，或构建后立即 `dmesg | grep -i oom`。若 uv 安装依赖时 OOM，缓解方案按序尝试：① 构建时临时 `systemctl stop radio-association`（反正切换前也要停）；② `pip install uv` 后改 Dockerfile 用 `uv sync --no-cache`；③ 最终手段：在本地机器 `docker buildx build --platform linux/<Q1的架构> -t radio-association:<SHA> .` 后 `docker save | ssh admin@... "su -c 'docker load'"`。

**Q6. `radioctl restore` 对已禁用服务的 `systemctl stop` 调用是否返回成功。**
迁移完成后实测：`systemctl stop radio-association.service; echo $?`。预期 0。若非 0，按 7.3 末尾的手动 restore 流程替代，并把该结论写入运维文档。

**Q7. 生产 `app.env` 的实际键集合。**
计划假设其含 `DATABASE_PATH`、`RECRUITMENT_CONFIG_PATH`、`ADMISSIONS_DATA_PATH`、`BACKUP_STATUS_PATH`（与仓库 `deployment/app.env.example` 一致），且值均为 `/var/lib/radio-association/` 下的绝对路径。用 `grep -oE '^[A-Z_]+' /etc/radio-association/app.env` 核对键名；若缺某个路径键，说明应用在用代码默认值，需确认默认值指向何处（`backend/config/database.py` 等），挂载路径必须覆盖实际生效路径。

**Q8. 应用是否还有其他写路径未纳入挂载。**
盘点命令：在源码 `/opt/radio-association/docker/src/backend/` 里 `grep -rn 'open(\|os.makedirs\|Path(' --include='*.py' | grep -iv test`，人工确认所有文件写入点都在 `/var/lib/radio-association/` 之下。发现例外（如日志文件、临时上传目录）则在 compose `volumes:` 追加对应挂载。

**Q9. Nginx 到后端的超时/头配置是否依赖进程模型。**
不预期有差异（都是 127.0.0.1:5000 的 HTTP），但切换后用真实浏览器走一遍：首页、提交测试申请（若申请开放）、负责人登录、录取查询，确认无 502/504。

**Q10. 旧 `radio-remote.ps1` 与文档生态。**
迁移后 `radio-remote.ps1` 的 Deploy/Rollback/Restore/Configure/Admissions 动作全部失效（只 Backup/Status/Tunnel 尚可）。本计划不改造该脚本；在第 8 节清理阶段把它标注为废弃或删除。执行者无需在迁移期处理，只需知道不要再用它发布。

**Q11. 服务器访问 GitHub 的稳定性。**
仓库已确认为**公开**，无需任何凭据。4.1 前实测 `git ls-remote https://github.com/HaoxiangXia/YSU-radio-association2026.git`：可达即正常执行；香港机房偶发 GitHub 抽风时，重试或改用镜像加速（如 `https://ghproxy.com/` 前缀，执行者自行验证当时可用的镜像）；完全不可达时退回本地构建镜像 + `docker save | ssh "su -c 'docker load'"` 的离线方案（见 Q5 ③）。无论哪种方式，部署完整性都由 `git checkout <SHA>` + `git rev-parse HEAD` 核对保证。
