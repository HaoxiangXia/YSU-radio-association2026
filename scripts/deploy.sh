#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
旧的一键部署脚本已停用，因为它会公开 5000 端口、在运行目录拉取分支并直接复制 WAL 数据库。

请改用 Docker + Caddy 部署流程：
  1. 首次部署与服务器重建：docs/DOCKER_DEPLOYMENT.md
  2. 日常发布/回滚/备份：docs/OPERATIONS_QUICK_REFERENCE.md

本脚本不会修改服务器。
EOF
exit 64
