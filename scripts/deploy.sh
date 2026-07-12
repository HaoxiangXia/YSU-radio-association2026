#!/usr/bin/env bash
# radio-association 一键部署脚本
# 适用：Ubuntu 22.04 / 阿里云 ECS / 无域名 / 裸机部署
# 用法：chmod +x deploy.sh && ./deploy.sh

set -euo pipefail

REPO_URL="https://github.com/HaoxiangXia/YSU-radio-association2026.git"
BRANCH="dev"
APP_DIR="/var/www/radio-association"
DEPLOY_USER="deploy"
BUN_PATH="/root/.bun/bin/bun"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否 root
if [ "$EUID" -ne 0 ]; then
    error "请使用 root 用户执行此脚本"
    exit 1
fi

# 检查 bun 是否安装
if ! command -v bun > /dev/null 2>&1; then
    if [ -x "$BUN_PATH" ]; then
        log "Bun 安装在 $BUN_PATH"
    else
        error "未找到 Bun，请先安装 Bun: https://bun.sh/docs/installation"
        exit 1
    fi
else
    BUN_PATH=$(command -v bun)
fi

log "Bun 路径: $BUN_PATH"
log "Bun 版本: $($BUN_PATH -v)"

# 如果 Bun 在 root 家目录下，其他用户无法访问，复制到系统路径
if [[ "$BUN_PATH" == /root/.bun/* ]]; then
    log "Bun 位于 /root/.bun，复制到 /usr/local/bin 以便 deploy 用户使用..."
    cp "$BUN_PATH" /usr/local/bin/bun
    chmod +x /usr/local/bin/bun
    BUN_PATH="/usr/local/bin/bun"
fi

# 检查 git
if ! command -v git > /dev/null 2>&1; then
    log "安装 git..."
    apt update
    apt install -y git
fi

# 创建部署用户
if ! id "$DEPLOY_USER" > /dev/null 2>&1; then
    log "创建部署用户: $DEPLOY_USER"
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
fi

# 创建项目目录
log "创建项目目录 $APP_DIR"
mkdir -p "$APP_DIR"
chown -R "$DEPLOY_USER":"$DEPLOY_USER" /var/www

# 克隆或更新项目
if [ -d "$APP_DIR/.git" ]; then
    log "项目已存在，拉取最新代码..."
    cd "$APP_DIR"
    sudo -u "$DEPLOY_USER" git fetch origin
    sudo -u "$DEPLOY_USER" git checkout "$BRANCH"
    sudo -u "$DEPLOY_USER" git pull origin "$BRANCH"
else
    log "克隆仓库..."
    cd /var/www
    rm -rf "$APP_DIR"
    sudo -u "$DEPLOY_USER" git clone -b "$BRANCH" "$REPO_URL" radio-association
fi

cd "$APP_DIR"

# 安装依赖
log "安装依赖..."
sudo -u "$DEPLOY_USER" "$BUN_PATH" install

# 初始化数据库
if [ ! -f "$APP_DIR/server/data/database.sqlite" ]; then
    log "初始化数据库..."
    sudo -u "$DEPLOY_USER" "$BUN_PATH" server/initDB.js
else
    warn "数据库已存在，跳过初始化。如需重新初始化，请手动运行 bun server/initDB.js"
fi

# 配置环境变量
ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    log "创建环境变量文件..."

    read -rp "请输入 JWT_SECRET（直接回车将自动生成）: " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        log "已自动生成 JWT_SECRET"
    fi

    read -rp "请输入招新负责人账号（默认 admin）: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}

    read -srp "请输入招新负责人密码: " ADMIN_PASS
    echo
    if [ -z "$ADMIN_PASS" ]; then
        error "招新负责人密码不能为空"
        exit 1
    fi

    read -rp "请输入招新负责人显示名称（默认 招新负责人）: " ADMIN_NAME
    ADMIN_NAME=${ADMIN_NAME:-管理员}

    cat > "$ENV_FILE" <<EOF
PORT=8000
JWT_SECRET=$JWT_SECRET
RECRUITMENT_OFFICER_ACCOUNTS=$ADMIN_USER:$ADMIN_PASS:$ADMIN_NAME
EOF

    chown "$DEPLOY_USER":"$DEPLOY_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    log "环境变量已写入 $ENV_FILE"
else
    warn "$ENV_FILE 已存在，跳过创建"
fi

# 创建 systemd 服务
SERVICE_FILE="/etc/systemd/system/radio-association.service"
log "创建 systemd 服务..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Radio Association Web App
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$BUN_PATH server/app.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable radio-association
systemctl restart radio-association

# 检查服务状态
sleep 2
if systemctl is-active --quiet radio-association; then
    log "服务启动成功"
else
    error "服务启动失败，请查看日志:"
    systemctl status radio-association --no-pager
    journalctl -u radio-association -n 50 --no-pager
    exit 1
fi

# 检查端口
sleep 1
if ss -tlnp | grep -q ':8000'; then
    log "端口 8000 正在监听"
else
    error "端口 8000 未监听，请检查日志"
    exit 1
fi

# 配置防火墙
log "配置防火墙..."
if command -v ufw > /dev/null 2>&1; then
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 8000/tcp
    ufw --force enable
    log "ufw 防火墙已启用，开放端口: 22, 8000"
else
    warn "ufw 未安装，跳过防火墙配置"
fi

# 配置备份
log "配置本地备份..."
mkdir -p /var/backups/radio-association

# 写入定时任务
CRON_JOB_BACKUP="0 3 * * * cp $APP_DIR/server/data/database.sqlite /var/backups/radio-association/db-\$(date +\\%Y\\%m\\%d).sqlite"
CRON_JOB_CLEAN="0 4 * * * find /var/backups/radio-association -name 'db-*.sqlite' -mtime +7 -delete"

if ! crontab -l 2>/dev/null | grep -q "radio-association"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB_BACKUP"; echo "$CRON_JOB_CLEAN") | crontab -
    log "备份定时任务已添加"
else
    warn "备份定时任务已存在，跳过"
fi

# 安全提示
log "部署完成"
echo
log "访问地址: http://$(curl -s http://checkip.aliyun.com || echo '你的服务器IP'):8000"
log "招新负责人后台: http://$(curl -s http://checkip.aliyun.com || echo '你的服务器IP'):8000/html/membership-applications.html"
log "服务状态: systemctl status radio-association"
log "查看日志: journalctl -u radio-association -f"
echo
warn "重要提醒："
echo "1. 请在阿里云安全组中放行 8000 端口"
echo "2. 建议禁用 root 密码登录，改用 deploy 用户 + 密钥登录"
echo "3. 当前未配置 HTTPS，请勿通过公网传输敏感密码"
echo "4. 如不需要时请停止 VS Code Server 以释放内存"
