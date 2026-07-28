#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
旧的一键部署脚本已停用，因为它会公开 5000 端口、在运行目录拉取分支并直接复制 WAL 数据库。

请改用：
  1. 首次服务器准备：sudo bash scripts/bootstrap-server.sh
  2. 后续精确版本发布：sudo radioctl deploy <archive.tar.gz> <commit-sha> <sha256>
  3. Windows 本地入口：powershell -File scripts/radio-remote.ps1

本脚本不会修改服务器。
EOF
exit 64
