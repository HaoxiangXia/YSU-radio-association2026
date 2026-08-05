#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

PUBLIC_AVAILABLE="/etc/nginx/sites-available/radio-association-public"
PUBLIC_ENABLED="/etc/nginx/sites-enabled/radio-association-public"
STAGING_AVAILABLE="/etc/nginx/sites-available/radio-association-staging"
STAGING_ENABLED="/etc/nginx/sites-enabled/radio-association-staging"
LOG_FORMAT_TARGET="/etc/nginx/conf.d/radio-association-log-format.conf"
ACME_ROOT="/var/www/letsencrypt"
DOMAIN_STATE="/etc/radio-association/public-domain"

log() {
    printf '[radio-public] %s\n' "$*"
}

fail() {
    printf '[radio-public] 错误：%s\n' "$*" >&2
    exit 1
}

require_root() {
    [[ "${EUID:-$(id -u)}" -eq 0 ]] || fail "该操作必须由 root 或 sudo 执行"
}

validate_domain() {
    local domain="$1"
    [[ ${#domain} -le 253 ]] || fail "域名过长"
    [[ "$domain" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]] ||
        fail "域名格式无效：$domain"
}

validate_source_file() {
    local path="$1"
    [[ -f "$path" ]] || fail "缺少配置源文件：$path"
    [[ ! -L "$path" ]] || fail "配置源文件不能是符号链接：$path"
}

check_enabled_sites() {
    local name
    while IFS= read -r name; do
        case "$name" in
            radio-association-staging|radio-association-public) ;;
            *) fail "发现未知的已启用 Nginx 站点：$name" ;;
        esac
    done < <(
        find /etc/nginx/sites-enabled -mindepth 1 -maxdepth 1 -printf '%f\n' |
            sort
    )
    [[ -L "$STAGING_ENABLED" ]] || fail "回环预生产站点未启用，停止修改公网配置"
    [[ "$(readlink -f "$STAGING_ENABLED")" == "$STAGING_AVAILABLE" ]] ||
        fail "回环预生产站点指向未知配置，停止修改公网配置"
    if [[ -e "$PUBLIC_ENABLED" || -L "$PUBLIC_ENABLED" ]]; then
        [[ -L "$PUBLIC_ENABLED" ]] || fail "公网站点入口不是符号链接"
        [[ "$(readlink -f "$PUBLIC_ENABLED")" == "$PUBLIC_AVAILABLE" ]] ||
            fail "公网站点入口指向未知配置"
    fi
}

render_template() {
    local template="$1" domain="$2" destination="$3"
    local rendered
    rendered="$(mktemp)"
    sed "s/__DOMAIN__/$domain/g" "$template" >"$rendered"
    install -o root -g root -m 0644 "$rendered" "$destination"
    rm -f "$rendered"
}

install_public_config() {
    local template="$1" domain="$2"
    local candidate previous=""
    candidate="$(mktemp)"
    render_template "$template" "$domain" "$candidate"
    if [[ -f "$PUBLIC_AVAILABLE" ]]; then
        previous="$(mktemp)"
        cp --preserve=mode,ownership,timestamps "$PUBLIC_AVAILABLE" "$previous"
    fi
    install -o root -g root -m 0644 "$candidate" "${PUBLIC_AVAILABLE}.new.$$"
    mv -f "${PUBLIC_AVAILABLE}.new.$$" "$PUBLIC_AVAILABLE"
    rm -f "$candidate"
    if [[ ! -e "$PUBLIC_ENABLED" && ! -L "$PUBLIC_ENABLED" ]]; then
        ln -s "$PUBLIC_AVAILABLE" "$PUBLIC_ENABLED"
    fi
    if ! nginx -t; then
        if [[ -n "$previous" ]]; then
            install -o root -g root -m 0644 "$previous" "$PUBLIC_AVAILABLE"
        else
            rm -f "$PUBLIC_ENABLED" "$PUBLIC_AVAILABLE"
        fi
        rm -f "$previous"
        nginx -t || true
        fail "Nginx 配置检查失败，已恢复修改前配置"
    fi
    rm -f "$previous"
    systemctl reload nginx
}

install_common_files() {
    local log_format_source="$1"
    validate_source_file "$log_format_source"
    getent group www-data >/dev/null || fail "服务器缺少 Nginx 的 www-data 用户组"
    install -d -o root -g www-data -m 0750 "$ACME_ROOT" "$ACME_ROOT/.well-known"
    install -d -o root -g www-data -m 2750 "$ACME_ROOT/.well-known/acme-challenge"
    install -o root -g root -m 0644 "$log_format_source" "$LOG_FORMAT_TARGET"
}

check_http_challenge() {
    local domain="$1" token="radio-acme-check-$$"
    printf 'ok\n' >"$ACME_ROOT/.well-known/acme-challenge/$token"
    if ! curl --fail --silent --show-error --max-time 5 \
        --header "Host: $domain" \
        "http://127.0.0.1/.well-known/acme-challenge/$token" |
        grep -qx 'ok'; then
        rm -f "$ACME_ROOT/.well-known/acme-challenge/$token"
        fail "本机 ACME HTTP 验证路径不可用"
    fi
    rm -f "$ACME_ROOT/.well-known/acme-challenge/$token"
}

command_prepare() {
    [[ $# -eq 3 ]] || fail "用法：prepare <domain> <http-template> <log-format>"
    local domain="$1" http_template="$2" log_format_source="$3"
    validate_domain "$domain"
    validate_source_file "$http_template"
    check_enabled_sites
    if [[ -f "$PUBLIC_AVAILABLE" ]] && grep -qE '^[[:space:]]*listen[[:space:]]+443' "$PUBLIC_AVAILABLE"; then
        fail "公网 HTTPS 已启用，不会用准备配置覆盖；请使用 status 检查"
    fi
    install_common_files "$log_format_source"
    install_public_config "$http_template" "$domain"
    printf '%s\n' "$domain" >"${DOMAIN_STATE}.new.$$"
    chown root:root "${DOMAIN_STATE}.new.$$"
    chmod 0644 "${DOMAIN_STATE}.new.$$"
    mv -f "${DOMAIN_STATE}.new.$$" "$DOMAIN_STATE"
    check_http_challenge "$domain"
    log "HTTP 验证入口已准备；业务应用尚未通过公网提供"
}

command_enable() {
    [[ $# -eq 4 ]] || fail "用法：enable <domain> <https-template> <log-format> <renew-hook>"
    local domain="$1" https_template="$2" log_format_source="$3" renew_hook="$4"
    validate_domain "$domain"
    validate_source_file "$https_template"
    validate_source_file "$renew_hook"
    check_enabled_sites
    [[ -f "$DOMAIN_STATE" ]] || fail "尚未执行公网 HTTP 准备"
    [[ "$(tr -d '\r\n' <"$DOMAIN_STATE")" == "$domain" ]] ||
        fail "请求域名与已准备域名不一致"
    [[ -f "$PUBLIC_AVAILABLE" ]] || fail "公网 HTTP 配置不存在"
    install_common_files "$log_format_source"
    check_http_challenge "$domain"
    certbot certonly \
        --webroot --webroot-path "$ACME_ROOT" \
        --domains "$domain" --cert-name "$domain" \
        --preferred-challenges http \
        --non-interactive --agree-tos --register-unsafely-without-email \
        --keep-until-expiring
    [[ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]] || fail "证书签发后未找到证书链"
    [[ -f "/etc/letsencrypt/live/$domain/privkey.pem" ]] || fail "证书签发后未找到私钥"
    install -d -o root -g root -m 0755 /etc/letsencrypt/renewal-hooks/deploy
    install -o root -g root -m 0755 "$renew_hook" \
        /etc/letsencrypt/renewal-hooks/deploy/reload-radio-nginx
    install_public_config "$https_template" "$domain"
    systemctl enable --now certbot.timer
    curl --fail --silent --show-error --max-time 10 \
        --resolve "$domain:443:127.0.0.1" "https://$domain/healthz" >/dev/null
    log "HTTPS 已启用，HTTP 已跳转到 HTTPS"
}

command_status() {
    [[ $# -eq 1 ]] || fail "用法：status <domain>"
    local domain="$1"
    validate_domain "$domain"
    printf 'domain_state=%s\n' "$(cat "$DOMAIN_STATE" 2>/dev/null || true)"
    printf 'nginx_active=%s\n' "$(systemctl is-active nginx 2>/dev/null || true)"
    printf 'certbot_timer=%s\n' "$(systemctl is-active certbot.timer 2>/dev/null || true)"
    printf 'listeners:\n'
    ss -ltnp | grep -E ':(80|443|5000|8080)\b' || true
    printf 'certificate:\n'
    if [[ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]]; then
        openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" \
            -noout -subject -issuer -dates
    else
        printf 'not-issued\n'
    fi
    printf 'nginx_config:\n'
    nginx -t
}

require_root
command="${1:-}"
[[ -n "$command" ]] || fail "需要 prepare、enable 或 status"
shift

case "$command" in
    prepare) command_prepare "$@" ;;
    enable) command_enable "$@" ;;
    status) command_status "$@" ;;
    *) fail "未知操作：$command" ;;
esac
