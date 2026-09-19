#!/usr/bin/env bash
# deployment/deploy.sh: 服务器端单步部署脚本（在 git 仓库根目录执行）。
# 用法：
#   sudo bash deployment/deploy.sh <40位SHA或版本Tag>
#
# 注意：本脚本全部逻辑封装在 main() 函数中，以保证 bash 预先整体解析进内存，
# 避免 git checkout 检出不同版本时因磁盘文件被替换导致脚本中断。
set -Eeuo pipefail
umask 027

main() {
    local target="${1:-}"
    local repo_root compose_dir env_file image_repo
    local lock_file actual_sha old_sha

    # 1. 路径推导与定位（自适应执行路径，只要在仓库内即可）
    repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../" && pwd)"
    compose_dir="$repo_root/deployment/docker"
    env_file="$compose_dir/.env"
    image_repo="${RADIO_IMAGE_REPO:-ghcr.io/haoxiangxia/radio-association}"
    lock_file="/run/lock/radio-association-deploy.lock"

    # 2. 权限检查
    if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
        :
    else
        printf '\033[31m[错误] 必须以 root 或 sudo 执行此脚本。\033[0m\n' >&2
        printf '用法：sudo bash deployment/deploy.sh <40位SHA或版本Tag>\n' >&2
        exit 1
    fi

    # 3. 参数校验
    if [[ -z "$target" ]]; then
        printf '\033[31m[错误] 缺少目标版本参数。\033[0m\n' >&2
        printf '用法：sudo bash %s <40位SHA或版本Tag>\n' "${BASH_SOURCE[0]}" >&2
        exit 2
    fi

    if [[ ! -f "$env_file" ]]; then
        printf '\033[31m[错误] 未找到 %s，请先按文档完成服务器环境初始化。\033[0m\n' "$env_file" >&2
        exit 1
    fi

    # 4. 防并发锁
    mkdir -p "$(dirname "$lock_file")"
    exec 8>"$lock_file"
    if ! flock -n 8; then
        printf '\033[31m[错误] 另一项部署正在进行中，请勿重复执行。\033[0m\n' >&2
        exit 1
    fi

    printf '\033[32m==> [1/6] 执行发布前一致性数据库备份...\033[0m\n'
    if command -v radioctl >/dev/null 2>&1; then
        radioctl backup
    elif [[ -x "$repo_root/deployment/radioctl" ]]; then
        "$repo_root/deployment/radioctl" backup
    else
        printf '\033[31m[错误] 未找到 radioctl 备份工具，发布终止。\033[0m\n' >&2
        exit 1
    fi

    printf '\033[32m==> [2/6] 从 GHCR 拉取目标镜像：%s:%s\033[0m\n' "$image_repo" "$target"
    if ! docker pull "$image_repo:$target"; then
        printf '\033[31m[错误] 镜像拉取失败。请确认 Actions 已构建完成或 Tag/SHA 是否正确。\033[0m\n' >&2
        exit 1
    fi

    printf '\033[32m==> [3/6] 同步服务器运维目录源码...\033[0m\n'
    cd "$repo_root"
    if [[ -n "$(git status --porcelain)" ]]; then
        printf '\033[31m[错误] 服务器工作区存在未提交的修改，终止部署以防覆盖。\033[0m\n' >&2
        git status --short >&2
        exit 1
    fi

    git fetch origin --tags --quiet
    git checkout "$target" --quiet

    actual_sha="$(git rev-parse HEAD)"
    printf '已对齐到提交：%s\n' "$actual_sha"

    old_sha="$(grep '^RADIO_SHA=' "$env_file" | cut -d= -f2 || true)"
    printf '当前部署版本: %s -> 目标版本: %s\n' "${old_sha:-未知}" "$actual_sha"

    # 如果是按 tag 拉取，为本地打上 40 位 SHA 标签，确保 compose.yaml 可按 SHA 定位
    if [[ "$target" != "$actual_sha" ]]; then
        docker tag "$image_repo:$target" "$image_repo:$actual_sha" 2>/dev/null || true
    fi

    printf '\033[32m==> [4/6] 更新编排配置并重建容器...\033[0m\n'
    sed -i "s/^RADIO_SHA=.*/RADIO_SHA=$actual_sha/" "$env_file"

    cd "$compose_dir"
    docker compose up -d --no-build

    printf '\033[32m==> [5/6] 等待应用启动并执行健康检查（最长等待 20 秒）...\033[0m\n'
    local healthy=0
    for ((i=1; i<=10; i++)); do
        sleep 2
        if curl --fail --silent http://127.0.0.1:5000/healthz >/dev/null; then
            healthy=1
            break
        fi
    done

    if [[ "$healthy" -eq 1 ]]; then
        printf '\033[32m==> [6/6] 部署成功！健康检查响应正常。\033[0m\n'
        printf '当前运行版本: %s\n' "$actual_sha"
    else
        printf '\033[31m[警告] 健康检查超时未通过！正在触发自动回滚...\033[0m\n' >&2
        if [[ -n "$old_sha" ]]; then
            sed -i "s/^RADIO_SHA=.*/RADIO_SHA=$old_sha/" "$env_file"
            git checkout "$old_sha" --quiet 2>/dev/null || true
            docker compose up -d --no-build
            sleep 4
            if curl --fail --silent http://127.0.0.1:5000/healthz >/dev/null; then
                printf '\033[33m[回滚成功] 已恢复到旧版本：%s\033[0m\n' "$old_sha" >&2
            else
                printf '\033[31m[致命] 回滚后健康检查仍未通过，请立即查看日志：docker logs radio-association\033[0m\n' >&2
            fi
        fi
        exit 1
    fi
}

main "$@"
