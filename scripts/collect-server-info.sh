#!/usr/bin/env bash
# 服务器运维信息采集脚本（只读，不修改任何配置）
# 用法：chmod +x collect-server-info.sh && ./collect-server-info.sh

set -euo pipefail

REPORT_FILE="server-info-$(date +%Y%m%d-%H%M%S).txt"

collect() {
    echo "================================================"
    echo "服务器信息采集报告"
    echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================"
    echo

    echo "## 1. 基础系统信息"
    echo "- 主机名: $(hostname -f 2>/dev/null || hostname)"
    echo "- 操作系统: $(cat /etc/os-release 2>/dev/null | grep -E '^(PRETTY_NAME|NAME|VERSION)=' || echo '未知')"
    echo "- 内核: $(uname -r)"
    echo "- 架构: $(uname -m)"
    echo "- 运行时间: $(uptime -p 2>/dev/null || uptime)"
    echo

    echo "## 2. 硬件资源"
    echo "- CPU:"
    if command -v lscpu >/dev/null 2>&1; then
        lscpu | grep -E 'Model name|Socket|Core|Thread|CPU\(s\)'
    else
        grep -E 'model name|cpu cores|processor' /proc/cpuinfo | head -10
    fi
    echo "- 内存:"
    free -h
    echo "- 磁盘:"
    df -h | grep -E '^/dev|Filesystem|Avail|Use%'
    echo

    echo "## 3. 已安装的关键软件"
    for cmd in nginx docker docker-compose bun node npm pm2 caddy apache2 httpd certbot acme.sh; do
        if command -v "$cmd" >/dev/null 2>&1; then
            echo "- $cmd: $(("$cmd" --version 2>/dev/null || "$cmd" -v 2>/dev/null || echo '版本未知') | head -1)"
        else
            echo "- $cmd: 未安装"
        fi
    done
    echo

    echo "## 4. 运行中的服务（前30个）"
    if command -v systemctl >/dev/null 2>&1; then
        systemctl list-units --type=service --state=running | head -32
    else
        echo "systemctl 不可用"
    fi
    echo

    echo "## 5. 网络监听端口"
    if command -v ss >/dev/null 2>&1; then
        ss -tlnp
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tlnp
    else
        echo "ss/netstat 均不可用"
    fi
    echo

    echo "## 6. 防火墙状态"
    if command -v ufw >/dev/null 2>&1; then
        echo "### ufw"
        ufw status
    fi
    if command -v firewall-cmd >/dev/null 2>&1; then
        echo "### firewalld"
        firewall-cmd --list-all --permanent 2>/dev/null || firewall-cmd --list-all
    fi
    echo "### iptables (filter 表)"
    iptables -L -n 2>/dev/null | head -30 || echo "无法查看 iptables"
    echo

    echo "## 7. Web 服务器配置"
    echo "### Nginx 主配置"
    if [ -f /etc/nginx/nginx.conf ]; then
        echo "存在: /etc/nginx/nginx.conf"
    else
        echo "未找到 /etc/nginx/nginx.conf"
    fi
    echo "### Nginx 站点/配置目录"
    for d in /etc/nginx/conf.d /etc/nginx/sites-enabled /etc/nginx/sites-available; do
        if [ -d "$d" ]; then
            echo "- $d:"
            ls -la "$d" 2>/dev/null || true
        fi
    done
    echo

    echo "## 8. 现有 Web 项目目录"
    echo "### /var/www/"
    ls -la /var/www/ 2>/dev/null || echo "目录不存在或为空"
    echo
    echo "### 常见项目根目录"
    for d in /root /home /opt /srv /app; do
        if [ -d "$d" ]; then
            echo "- $d 下的一级目录:"
            ls -la "$d" 2>/dev/null | head -20
        fi
    done
    echo

    echo "## 9. 安全与登录"
    echo "- root 登录方式:"
    grep -E '^PermitRootLogin|^PasswordAuthentication|^PubkeyAuthentication|^Port' /etc/ssh/sshd_config 2>/dev/null | grep -v '^#' || true
    echo "- 当前登录用户:"
    who
    echo "- 最近一次登录失败/成功:"
    last -n 5 2>/dev/null || echo "last 命令不可用"
    echo

    echo "## 10. 需要你补充的信息（手动填写）"
    echo "- 云服务商（阿里云/腾讯云/华为云/其他）: ______"
    echo "- 服务器所在地域: ______"
    echo "- 域名: ______"
    echo "- 域名是否已完成 ICP 备案: 是/否"
    echo "- 安全组/防火墙已开放端口: ______"
    echo "- 预计并发访问人数: ______"
    echo "- 是否需要 HTTPS: 是/否"
    echo "- 是否有其他服务已部署在这台服务器: 是/否，说明: ______"
    echo "- 数据库备份是否要求异地/定时: 是/否"
    echo
}

collect | tee "$REPORT_FILE"
echo
echo "报告已保存到: $REPORT_FILE"
echo "请把上面的完整输出复制给我，我据此出运维方案。"
