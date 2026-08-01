import os
import shutil
import subprocess
import io
import tarfile
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
EXTRACT_MODULE_PATH = REPOSITORY_ROOT / "scripts" / "ops" / "extract_release.py"
EXTRACT_SPEC = spec_from_file_location("extract_release", EXTRACT_MODULE_PATH)
assert EXTRACT_SPEC and EXTRACT_SPEC.loader
extract_release = module_from_spec(EXTRACT_SPEC)
EXTRACT_SPEC.loader.exec_module(extract_release)


def read(relative_path: str) -> str:
    return (REPOSITORY_ROOT / relative_path).read_text(encoding="utf-8")


def test_legacy_deployment_is_disabled():
    script = read("scripts/deploy.sh")
    assert "exit 64" in script
    assert "git pull" not in script
    assert "git reset" not in script
    assert "ufw allow 5000" not in script
    assert "--host 0.0.0.0" not in script


def test_radioctl_and_templates_keep_preproduction_private():
    radioctl = read("deployment/radioctl")
    service = read("deployment/systemd/radio-association.service")
    nginx = read("deployment/nginx/radio-association-staging.conf")
    app_env = read("deployment/app.env.example")
    bootstrap = read("scripts/bootstrap-server.sh")

    for command in ("deploy", "rollback", "backup", "restore", "configure", "admissions"):
        assert command in radioctl
    assert "flock -n" in radioctl
    assert "backup_database \"predeploy\"" in radioctl
    assert "--host 127.0.0.1 --port 5000" in service
    assert "--host 0.0.0.0" not in service
    assert "listen 127.0.0.1:8080;" in nginx
    assert "client_max_body_size 3m;" in nginx
    assert "listen 80" not in nginx
    assert "listen 443" not in nginx
    assert "RECRUITMENT_CONFIG_PATH=/var/lib/radio-association/private/recruitment.json" in app_env
    assert 'RECRUITMENT_CONFIG="$STATE_ROOT/private/recruitment.json"' in radioctl
    assert 'install -d -o "$APP_USER" -g "$APP_USER" -m 0700 "$STATE_ROOT/private"' in bootstrap
    assert 'nginx_default_is_only_site=true' in bootstrap
    assert 'systemctl stop nginx' in bootstrap
    assert 'unlink "$nginx_default"' in bootstrap
    assert "非 Ubuntu 默认站点" in bootstrap
    assert "ReadWritePaths=/var/lib/radio-association" in service


def test_release_extractor_rejects_links(tmp_path):
    archive_path = tmp_path / "unsafe.tar.gz"
    destination = tmp_path / "destination"
    destination.mkdir()
    with tarfile.open(archive_path, "w:gz") as archive:
        link = tarfile.TarInfo("backend/link")
        link.type = tarfile.SYMTYPE
        link.linkname = "/etc/passwd"
        archive.addfile(link)

    with pytest.raises(ValueError, match="特殊文件"):
        extract_release.extract_release(archive_path, destination)


def test_release_extractor_accepts_regular_files(tmp_path):
    archive_path = tmp_path / "safe.tar.gz"
    destination = tmp_path / "destination"
    destination.mkdir()
    content = b"[project]\nname='safe'\n"
    with tarfile.open(archive_path, "w:gz") as archive:
        item = tarfile.TarInfo("backend/pyproject.toml")
        item.size = len(content)
        archive.addfile(item, io.BytesIO(content))

    extract_release.extract_release(archive_path, destination)
    assert (destination / "backend" / "pyproject.toml").read_bytes() == content


@pytest.mark.skipif(os.name == "nt", reason="CI 在 Linux 上执行 Bash 语法检查")
def test_bash_scripts_parse():
    if not shutil.which("bash"):
        pytest.skip("bash 不可用")
    scripts = [
        "deployment/radioctl",
        "scripts/bootstrap-server.sh",
        "scripts/collect-server-info.sh",
        "scripts/deploy.sh",
    ]
    for script in scripts:
        subprocess.run(
            ["bash", "-n", str(REPOSITORY_ROOT / script)],
            check=True,
            capture_output=True,
            text=True,
        )
