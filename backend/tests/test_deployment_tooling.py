import os
import shutil
import subprocess
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (REPOSITORY_ROOT / relative_path).read_text(encoding="utf-8")


def test_legacy_deployment_is_disabled():
    script = read("scripts/deploy.sh")
    assert "exit 64" in script
    assert "git pull" not in script
    assert "git reset" not in script
    assert "ufw allow 5000" not in script
    assert "--host 0.0.0.0" not in script


def test_deployment_assets_keep_loopback_and_limits():
    radioctl = read("deployment/radioctl")
    compose = read("deployment/docker/compose.yaml")
    dockerfile = read("deployment/docker/Dockerfile")
    caddyfile = read("deployment/caddy/Caddyfile.template")
    app_env = read("deployment/app.env.example")
    backup_service = read("deployment/systemd/radio-association-backup.service")

    # radioctl 只保留备份路径：排他锁与备份入口必须存在
    assert "flock -n" in radioctl
    assert 'backup)' in radioctl
    assert "backup-status.json" in radioctl

    # 容器只绑回环，数据整目录挂载，以非 root 身份运行
    assert '"127.0.0.1:5000:5000"' in compose
    assert "0.0.0.0:5000" not in compose
    assert "/var/lib/radio-association:/var/lib/radio-association" in compose
    assert "env_file: /etc/radio-association/app.env" in compose
    assert "user:" in compose

    # 宿主端口只绑定回环，因此容器可安全信任来自宿主 Caddy 的转发头；
    # 不能限定为 127.0.0.1，因为宿主进入容器时来源是 Docker 网关地址。
    assert "/healthz" in dockerfile
    assert "--forwarded-allow-ips\", \"*\"" in dockerfile

    # Caddy 承担公网入口：预生产只绑回环，请求体上限与运维端点屏蔽
    assert "bind 127.0.0.1" in caddyfile
    assert "max_size 3MB" in caddyfile
    assert "reverse_proxy 127.0.0.1:5000" in caddyfile
    assert "@ops path /ops/*" in caddyfile
    assert "X-Content-Type-Options nosniff" in caddyfile
    assert "encode zstd gzip" in caddyfile

    assert "RECRUITMENT_CONFIG_PATH=/var/lib/radio-association/private/recruitment.json" in app_env
    assert "radioctl backup" in backup_service


def test_static_webp_uses_browser_compatible_content_type(default_client):
    client, _ = default_client
    response = client.get(
        "/image/honors/2025-engineering-practice-national-special-880.webp"
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/webp"
    assert response.content.startswith(b"RIFF")


@pytest.mark.skipif(os.name == "nt", reason="CI 在 Linux 上执行 Bash 语法检查")
def test_bash_scripts_parse():
    if not shutil.which("bash"):
        pytest.skip("bash 不可用")
    scripts = [
        "deployment/radioctl",
        "scripts/deploy.sh",
    ]
    for script in scripts:
        subprocess.run(
            ["bash", "-n", str(REPOSITORY_ROOT / script)],
            check=True,
            capture_output=True,
            text=True,
        )
