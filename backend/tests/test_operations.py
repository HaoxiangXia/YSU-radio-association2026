import json
import sqlite3
from datetime import datetime, timedelta, timezone
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
BACKUP_MODULE_PATH = REPOSITORY_ROOT / "scripts" / "ops" / "sqlite_backup.py"
SPEC = spec_from_file_location("sqlite_backup", BACKUP_MODULE_PATH)
assert SPEC and SPEC.loader
sqlite_backup = module_from_spec(SPEC)
SPEC.loader.exec_module(sqlite_backup)


def test_health_endpoints_and_fresh_backup(default_client, monkeypatch, tmp_path):
    client, _ = default_client
    status_path = tmp_path / "backup-status.json"
    monkeypatch.setenv("BACKUP_STATUS_PATH", str(status_path))

    assert client.get("/livez").json() == {"ok": True}
    assert client.get("/healthz").json() == {"ok": True}
    assert client.get("/ops/backupz").status_code == 503

    status_path.write_text(
        json.dumps({
            "completedAt": datetime.now(timezone.utc).isoformat(),
            "ok": True,
        }),
        encoding="utf-8",
    )
    response = client.get("/ops/backupz")
    assert response.status_code == 200
    assert response.json()["ok"] is True

    status_path.write_text(
        json.dumps({
            "completedAt": (
                datetime.now(timezone.utc) - timedelta(hours=31)
            ).isoformat(),
            "ok": True,
        }),
        encoding="utf-8",
    )
    assert client.get("/ops/backupz").status_code == 503


def test_sqlite_backup_includes_wal_and_restores(tmp_path):
    source = tmp_path / "source.sqlite"
    backup = tmp_path / "backups" / "database.sqlite"
    restored = tmp_path / "restored.sqlite"
    safety = tmp_path / "safety"

    connection = sqlite3.connect(source)
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("CREATE TABLE records (value TEXT NOT NULL)")
    connection.execute("INSERT INTO records VALUES ('在线备份数据')")
    connection.commit()

    checksum = sqlite_backup.backup_database(source, backup)
    assert checksum == sqlite_backup.verify_checksum(backup)
    assert backup.with_suffix(".sqlite.sha256").is_file()

    safety_backup, restored_checksum = sqlite_backup.restore_database(
        backup,
        restored,
        safety,
    )
    assert safety_backup is None
    assert len(restored_checksum) == 64
    with sqlite3.connect(restored) as restored_connection:
        assert restored_connection.execute(
            "SELECT value FROM records"
        ).fetchone()[0] == "在线备份数据"
    connection.close()
