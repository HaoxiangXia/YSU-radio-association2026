#!/usr/bin/env bash
# 发布镜像（离线应急备用方案）：开发机构建 → docker save | ssh → 服务器 docker load → 双侧核对镜像 ID。
# 主干首选方案见 .github/workflows/docker-publish.yml 与 docs/DOCKER_DEPLOYMENT.md。
#
# 用法：
#   scripts/release-image.sh [SHA]
#     SHA 省略时取当前 HEAD；给定 SHA 时必须已 checkout 到该提交。
#
# 可用环境变量覆盖：
#   RADIO_SERVER   SSH 目标（默认 admin@43.129.242.112）
#   RADIO_SSH_KEY  SSH 私钥路径（默认 ~/.ssh/id_ed25519）
#   ALLOW_UNPUSHED 设为 1 时跳过"SHA 已推送远端"检查（仅限预生产调试）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SERVER="${RADIO_SERVER:-admin@43.129.242.112}"
SSH_KEY="${RADIO_SSH_KEY:-$HOME/.ssh/id_ed25519}"
IMAGE_NAME="radio-association"

SHA="${1:-$(git rev-parse HEAD)}"
if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
    echo "错误：SHA 必须是完整 40 位 commit SHA，收到：$SHA" >&2
    exit 64
fi

HEAD="$(git rev-parse HEAD)"
if [[ "$HEAD" != "$SHA" ]]; then
    echo "错误：当前 HEAD（$HEAD）与目标 SHA 不符。" >&2
    echo "请先执行：git checkout $SHA && git rev-parse HEAD 核对后再运行。" >&2
    exit 64
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "错误：工作区有未提交变更，发布源必须是干净的提交。" >&2
    git status --short >&2
    exit 64
fi

if [[ "${ALLOW_UNPUSHED:-0}" != "1" ]]; then
    git fetch origin --quiet
    if ! git branch -r --contains "$SHA" | grep -q .; then
        echo "错误：$SHA 未推送到任何远端分支，发布源必须是已推送的提交。" >&2
        echo "先 git push，或确认在调试时设 ALLOW_UNPUSHED=1。" >&2
        exit 64
    fi
fi

IMAGE="$IMAGE_NAME:$SHA"

echo "==> 构建 $IMAGE（linux/amd64，与服务器同架构）"
docker build -f deployment/docker/Dockerfile -t "$IMAGE" .

LOCAL_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE")"
echo "==> 本地镜像 ID：$LOCAL_ID"

IMAGE_SIZE="$(docker image inspect --format '{{.Size}}' "$IMAGE")"
echo "==> 传输到 $SERVER（镜像约 $((IMAGE_SIZE / 1024 / 1024)) MB，gzip 压缩，需耐心等待）"
if command -v pv >/dev/null 2>&1; then
    # pv 以未压缩大小估算进度/ETA，gzip 压缩后实际流量更小，进度仅供参考
    docker save "$IMAGE" | pv -s "$IMAGE_SIZE" | gzip | ssh -i "$SSH_KEY" "$SERVER" "gunzip | docker load"
else
    echo "提示：安装 pv（sudo apt install pv）可显示传输进度。" >&2
    docker save "$IMAGE" | gzip | ssh -i "$SSH_KEY" "$SERVER" "gunzip | docker load"
fi

REMOTE_ID="$(ssh -i "$SSH_KEY" "$SERVER" "docker image inspect --format '{{.Id}}' '$IMAGE'")"
echo "==> 服务器镜像 ID：$REMOTE_ID"

if [[ "$LOCAL_ID" != "$REMOTE_ID" ]]; then
    echo "错误：双侧镜像 ID 不一致，传输不完整。重新运行本脚本，不要用残缺的镜像启动。" >&2
    exit 1
fi

cat <<EOF
==> 镜像已就位且双侧 ID 一致。

服务器端切换版本（SSH 登录 $SERVER 后执行，详见 docs/DOCKER_DEPLOYMENT.md 8.1）：
  sudo radioctl backup
  cd /opt/radio-association/docker/src
  sudo git fetch origin && sudo git checkout $SHA
  cd deployment/docker
  sudo sed -i 's/^RADIO_SHA=.*/RADIO_SHA=$SHA/' .env
  # 若使用直传的本地镜像名（未走 ghcr.io），打上对应 tag 或在 .env 配置 RADIO_IMAGE_REPO=radio-association：
  sudo docker tag radio-association:$SHA ghcr.io/haoxiangxia/radio-association:$SHA 2>/dev/null || true
  sudo docker compose up -d --no-build
  sleep 5 && curl --fail http://127.0.0.1:5000/healthz
EOF
