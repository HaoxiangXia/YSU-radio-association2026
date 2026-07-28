#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

[[ "${EUID:-$(id -u)}" -eq 0 ]] || {
    echo "错误：请使用 sudo 或 root 执行 bootstrap" >&2
    exit 1
}

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER="radio-association"
APP_ROOT="/opt/radio-association"
CONFIG_DIR="/etc/radio-association"
STATE_ROOT="/var/lib/radio-association"
BACKUP_ROOT="/var/backups/radio-association"
LIB_DIR="/usr/local/lib/radio-association"
UV_PYTHON_INSTALL_DIR="/opt/uv-python"

if command -v nginx >/dev/null 2>&1 &&
    systemctl is-active --quiet nginx 2>/dev/null; then
    echo "错误：检测到正在运行的 Nginx，bootstrap 不会覆盖现有 Web 服务" >&2
    exit 1
fi
if command -v ss >/dev/null 2>&1 &&
    ss -H -ltn | awk '{print $4}' | grep -Eq ':(80|443|5000|8080)$'; then
    echo "错误：80、443、5000 或 8080 已被占用，请先确认现有业务" >&2
    exit 1
fi

required_files=(
    "$REPOSITORY_ROOT/deployment/radioctl"
    "$REPOSITORY_ROOT/deployment/systemd/radio-association.service"
    "$REPOSITORY_ROOT/deployment/systemd/radio-association-backup.service"
    "$REPOSITORY_ROOT/deployment/systemd/radio-association-backup.timer"
    "$REPOSITORY_ROOT/deployment/nginx/radio-association-staging.conf"
    "$REPOSITORY_ROOT/scripts/ops/sqlite_backup.py"
    "$REPOSITORY_ROOT/scripts/ops/extract_release.py"
    "$REPOSITORY_ROOT/config/recruitment.example.json"
)
for required_file in "${required_files[@]}"; do
    [[ -f "$required_file" ]] || {
        echo "错误：bootstrap 归档缺少 $required_file" >&2
        exit 1
    }
done

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
    ca-certificates curl nginx certbot openssl python3 python3-venv \
    tar util-linux

if ! command -v uv >/dev/null 2>&1; then
    echo "安装 uv 到 /usr/local/bin"
    curl --proto '=https' --tlsv1.2 -LsSf https://astral.sh/uv/install.sh |
        env UV_INSTALL_DIR=/usr/local/bin sh
fi
uv --version
install -d -o root -g root -m 0755 "$UV_PYTHON_INSTALL_DIR"
export UV_PYTHON_INSTALL_DIR
uv python install 3.11

if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --home-dir "$STATE_ROOT" --shell /usr/sbin/nologin "$APP_USER"
fi

install -d -o root -g "$APP_USER" -m 0750 \
    "$APP_ROOT" "$APP_ROOT/releases" "$CONFIG_DIR" "$STATE_ROOT"
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 \
    "$STATE_ROOT/data" "$STATE_ROOT/state"
install -d -o root -g "$APP_USER" -m 0750 "$STATE_ROOT/private"
install -d -o root -g root -m 0750 "$BACKUP_ROOT" "$LIB_DIR"

install -o root -g root -m 0755 \
    "$REPOSITORY_ROOT/deployment/radioctl" /usr/local/sbin/radioctl
install -o root -g root -m 0755 \
    "$REPOSITORY_ROOT/scripts/ops/sqlite_backup.py" "$LIB_DIR/sqlite_backup.py"
install -o root -g root -m 0755 \
    "$REPOSITORY_ROOT/scripts/ops/extract_release.py" "$LIB_DIR/extract_release.py"
install -o root -g root -m 0644 \
    "$REPOSITORY_ROOT/deployment/systemd/radio-association.service" \
    /etc/systemd/system/radio-association.service
install -o root -g root -m 0644 \
    "$REPOSITORY_ROOT/deployment/systemd/radio-association-backup.service" \
    /etc/systemd/system/radio-association-backup.service
install -o root -g root -m 0644 \
    "$REPOSITORY_ROOT/deployment/systemd/radio-association-backup.timer" \
    /etc/systemd/system/radio-association-backup.timer
install -o root -g root -m 0644 \
    "$REPOSITORY_ROOT/deployment/app.env.example" "$CONFIG_DIR/app.env.example"
install -o root -g root -m 0600 \
    "$REPOSITORY_ROOT/deployment/backup.env.example" "$CONFIG_DIR/backup.env.example"

if [[ ! -f "$CONFIG_DIR/recruitment.json" ]]; then
    install -o root -g "$APP_USER" -m 0640 \
        "$REPOSITORY_ROOT/config/recruitment.example.json" \
        "$CONFIG_DIR/recruitment.json"
fi

nginx_available="/etc/nginx/sites-available/radio-association-staging"
nginx_enabled="/etc/nginx/sites-enabled/radio-association-staging"
nginx_default="/etc/nginx/sites-enabled/default"
if [[ -L "$nginx_default" ]] &&
    [[ "$(readlink -f "$nginx_default")" == "/etc/nginx/sites-available/default" ]]; then
    mv "$nginx_default" /etc/nginx/sites-available/default.disabled-by-radio-association
fi
install -o root -g root -m 0644 \
    "$REPOSITORY_ROOT/deployment/nginx/radio-association-staging.conf" \
    "$nginx_available"
if [[ ! -e "$nginx_enabled" ]]; then
    ln -s "$nginx_available" "$nginx_enabled"
fi
nginx -t

systemctl daemon-reload
systemctl enable radio-association.service
systemctl enable --now radio-association-backup.timer
systemctl enable --now nginx

unexpected_web_listeners="$(
    ss -H -ltn | awk '{print $4}' |
        grep -E ':(80|443|5000|8080)$' |
        grep -Ev '^127\.0\.0\.1:(5000|8080)$' || true
)"
if [[ -n "$unexpected_web_listeners" ]]; then
    systemctl stop nginx
    echo "错误：发现非回环 Web 监听，已停止 Nginx：" >&2
    echo "$unexpected_web_listeners" >&2
    exit 1
fi

echo
echo "服务器基础结构已准备完成，但应用尚未部署，也未开放公网 Web 端口。"
echo "下一步："
echo "  1. 根据 $CONFIG_DIR/app.env.example 创建权限 600 的 app.env"
echo "  2. 使用 Windows 入口上传精确 commit 归档并调用 radioctl deploy"
echo "  3. 通过 SSH 隧道访问 http://127.0.0.1:8080 验证"
