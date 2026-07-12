# `radio-association` 生产环境运维方案（定稿）

> 适用服务器：阿里云 ECS / Ubuntu 22.04 LTS / 2 vCPU / 1.6 GB RAM / 40 GB SSD
> 访问方式：无域名，使用 `http://47.95.247.186:8000`
> 代码仓库：`https://github.com/HaoxiangXia/YSU-radio-association2026/tree/dev`

---

## 1. 决策确认

| 项 | 决策 |
|---|---|
| 域名 | 暂不使用 |
| HTTPS | 暂不使用（IP 无法申请免费证书，等域名+备案后再配） |
| 访问入口 | `http://47.95.247.186:8000` |
| 部署方式 | 裸机 + systemd + Bun（不用 Docker，省内存） |
| 反向代理 | 暂不使用 Nginx（省内存），Bun 直接监听 8000 端口 |
| 静态文件 | 由 Express 静态中间件服务（`public/` 目录） |
| 数据库 | 本地 SQLite（`server/data/database.sqlite`） |
| 备份 | 本地每日自动备份，保留 7 天 |
| 其他服务 | 保留 VS Code Server，但需监控内存 |

---

## 2. 架构图

```
用户浏览器
    │
    ▼
阿里云安全组（开放 8000 端口）
    │
    ▼
Bun 应用（server/app.js，监听 0.0.0.0:8000）
    │
    ▼
SQLite 数据库文件（server/data/database.sqlite）
```

---

## 3. 资源评估

当前服务器资源：

| 资源 | 总量 | 当前已用 | 可用 |
|---|---|---|---|
| CPU | 2 vCPU | - | 充足 |
| 内存 | 1.6 GB | 1.1 GB | 紧张 |
| 磁盘 | 40 GB | 5.6 GB | 充足 |
| Swap | 0 | 0 | 无 |

应用运行时估算：

| 组件 | 内存占用 |
|---|---|
| 系统基础 | ~400-600 MB |
| VS Code Server | ~100-200 MB（你已保留） |
| Bun 应用 | ~50-120 MB |
| 剩余缓冲 | ~200-400 MB |

**结论**：够用但紧张，因此采用最精简方案。后续如升级至 2GB 或 4GB，可加 Nginx 和 Docker。

---

## 4. 安全加固

### 4.1 创建部署用户

不要用 root 运行应用。

```bash
useradd -m -s /bin/bash deploy
usermod -aG sudo deploy
passwd deploy
```

### 4.2 项目目录权限

```bash
mkdir -p /var/www/radio-association
chown -R deploy:deploy /var/www/radio-association
```

### 4.3 SSH 加固（建议立刻执行）

```bash
# 关闭 root 密码登录，改为用 deploy 用户登录
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

> 注意：执行前先确保 `deploy` 用户可以登录，否则会被锁在外面。

### 4.4 启用防火墙

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 8000/tcp
ufw enable
```

> 80/443 不开放，因为无域名且未备案。

### 4.5 阿里云安全组

在阿里云控制台的安全组中，放行：

| 端口 | 协议 | 来源 | 用途 |
|---|---|---|---|
| 22 | TCP | 你的 IP | SSH |
| 8000 | TCP | 0.0.0.0/0 | 应用访问 |

---

## 5. 部署实施步骤

### 5.1 安装 Git（如果未安装）

```bash
apt update
apt install -y git
```

### 5.2 克隆项目

```bash
cd /var/www
sudo -u deploy git clone -b dev https://github.com/HaoxiangXia/YSU-radio-association2026.git radio-association
cd radio-association
sudo -u deploy bun install
```

### 5.3 初始化数据库

```bash
sudo -u deploy bun server/initDB.js
```

> 该脚本会重新初始化静态表，**生产环境不要反复运行**。

### 5.4 环境变量

创建 `/var/www/radio-association/.env`：

```env
PORT=8000
JWT_SECRET=你的随机字符串
ADMIN_ACCOUNTS=admin:你的密码:管理员
```

生成 JWT_SECRET：

```bash
openssl rand -base64 32
```

### 5.5 创建 systemd 服务

创建 `/etc/systemd/system/radio-association.service`：

```ini
[Unit]
Description=Radio Association Web App
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/var/www/radio-association
EnvironmentFile=/var/www/radio-association/.env
ExecStart=/root/.bun/bin/bun server/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
systemctl daemon-reload
systemctl enable radio-association
systemctl start radio-association
```

### 5.6 验证

```bash
systemctl status radio-association
journalctl -u radio-association -n 50
ss -tlnp | grep 8000
```

浏览器访问：`http://47.95.247.186:8000`

---

## 6. 数据库备份方案

### 6.1 本地定时备份

创建备份目录：

```bash
mkdir -p /var/backups/radio-association
```

添加 cron 任务：

```bash
# 编辑 crontab
crontab -e

# 添加以下内容（每天凌晨 3 点备份）
0 3 * * * cp /var/www/radio-association/server/data/database.sqlite /var/backups/radio-association/db-$(date +\%Y\%m\%d).sqlite
0 4 * * * find /var/backups/radio-association -name 'db-*.sqlite' -mtime +7 -delete
```

### 6.2 异地备份（可选）

如果你后续买了阿里云 OSS，可以加一条：

```bash
# 需要先安装并配置 aliyun CLI
0 5 * * * aliyun oss cp /var/backups/radio-association/db-$(date +\%Y\%m\%d).sqlite oss://your-bucket/radio-association-backups/
```

> 异地备份的意思是：把数据库文件复制到另一个地方（如云存储），防止服务器硬盘损坏或误删导致数据丢失。

---

## 7. 监控与日志

### 7.1 日志查看

```bash
# 实时查看应用日志
journalctl -u radio-association -f

# 查看最近 100 条
journalctl -u radio-association -n 100
```

### 7.2 资源监控

```bash
# 查看内存
top
free -h

# 查看端口监听
ss -tlnp

# 查看磁盘
df -h
```

### 7.3 建议配置阿里云云监控

在阿里云控制台添加：

- CPU 使用率 > 80% 告警
- 内存使用率 > 85% 告警
- 磁盘使用率 > 80% 告警
- 网络入流量异常告警

告警通知方式：短信/邮件/钉钉。

---

## 8. 更新与回滚

### 8.1 更新应用

```bash
cd /var/www/radio-association
sudo -u deploy git pull origin dev
sudo -u deploy bun install
systemctl restart radio-association
```

### 8.2 回滚

```bash
cd /var/www/radio-association
sudo -u deploy git log --oneline -5
sudo -u deploy git reset --hard <commit-hash>
systemctl restart radio-association
```

---

## 9. 应急预案

| 场景 | 处理步骤 |
|---|---|
| 应用无法访问 | 1. `systemctl status radio-association`<br>2. `journalctl -u radio-association -n 100`<br>3. 检查端口 `ss -tlnp \| grep 8000`<br>4. 检查安全组和防火墙 |
| 数据库损坏 | 1. 停止应用<br>2. 从 `/var/backups/radio-association/` 找最新备份<br>3. 复制覆盖 `server/data/database.sqlite`<br>4. 启动应用 |
| 内存耗尽 | 1. `free -h` 确认<br>2. 检查是否有异常进程<br>3. 重启 VS Code Server 或应用<br>4. 必要时升级服务器配置 |
| 服务器被入侵 | 1. 修改所有密码<br>2. 检查异常用户和定时任务<br>3. 从备份恢复数据<br>4. 重装系统（严重时） |
| 8080/5000 被占用 | 修改 `.env` 中的 `PORT`，并同步防火墙规则 |

---

## 10. 后续升级建议

当以下条件满足时，建议升级到标准架构：

| 条件 | 升级项 |
|---|---|
| 购买了域名并完成 ICP 备案 | 加 Nginx + Let's Encrypt HTTPS |
| 内存升级到 2GB 或更高 | 使用 Docker + docker-compose 部署 |
| 访问量长期超过 500 并发 | 考虑升级到 4GB 内存，或使用多实例 |
| 数据非常重要 | 接入阿里云 OSS 异地备份 |
| 频繁更新 | 配置 GitHub Actions 自动部署 |

---

## 11. 一键部署脚本

已配套提供 `scripts/deploy.sh`，在服务器上以 root 执行即可自动完成大部分步骤。

```bash
# 上传脚本到服务器后执行
chmod +x deploy.sh
./deploy.sh
```

脚本会提示你输入：

- Git 分支（默认 dev）
- JWT_SECRET
- 管理员账号和密码

---

*方案生成时间：2026-07-11*
