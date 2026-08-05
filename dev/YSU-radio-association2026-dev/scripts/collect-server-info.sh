#!/usr/bin/env bash
# 只读服务器盘点：不创建报告文件，不修改任何服务或配置。
set -u

section() {
    printf '\n## %s\n' "$1"
}

echo "# radio-association 服务器只读盘点"
echo "生成时间：$(date --iso-8601=seconds 2>/dev/null || date)"

section "系统"
uname -a
cat /etc/os-release 2>/dev/null || true
timedatectl status 2>/dev/null || true

section "资源"
free -h 2>/dev/null || true
df -hT 2>/dev/null || true
swapon --show 2>/dev/null || true

section "监听端口"
ss -ltnup 2>/dev/null || netstat -ltnup 2>/dev/null || true

section "运行服务"
systemctl list-units --type=service --state=running --no-pager 2>/dev/null || true

section "目标服务现状"
for unit in radio-association nginx ssh sshd; do
    printf '%s: ' "$unit"
    systemctl is-active "$unit" 2>/dev/null || true
done

section "防火墙"
ufw status verbose 2>/dev/null || true
firewall-cmd --list-all 2>/dev/null || true
nft list ruleset 2>/dev/null || true

section "SSH 生效配置"
sshd -T 2>/dev/null |
    grep -E '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication) ' ||
    true

section "Nginx"
nginx -v 2>&1 || true
nginx -T 2>&1 || true

section "目标目录"
for directory in \
    /opt/radio-association \
    /etc/radio-association \
    /var/lib/radio-association \
    /var/backups/radio-association \
    /var/www; do
    echo "-- $directory"
    ls -lad "$directory" 2>/dev/null || true
    find "$directory" -maxdepth 2 -mindepth 1 -printf '%M %u:%g %p\n' \
        2>/dev/null | head -100 || true
done

section "关键命令版本"
for command_name in python3 uv nginx certbot ossutil; do
    if command -v "$command_name" >/dev/null 2>&1; then
        printf '%s: ' "$command_name"
        "$command_name" --version 2>&1 | head -1
    else
        echo "$command_name: 未安装"
    fi
done
