import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from config.database import get_database_path
from config.recruitment import get_recruitment_config


router = APIRouter()
MAX_BACKUP_AGE = timedelta(hours=30)


def get_backup_status_path() -> Path:
    configured_path = os.environ.get("BACKUP_STATUS_PATH")
    if configured_path:
        return Path(configured_path).expanduser().resolve()
    return get_database_path().parent / "backup-status.json"


def read_last_successful_backup(path: Path | None = None) -> datetime:
    status_path = path or get_backup_status_path()
    try:
        payload = json.loads(status_path.read_text(encoding="utf-8"))
        completed_at = datetime.fromisoformat(payload["completedAt"])
    except (FileNotFoundError, OSError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "尚无可用的成功备份记录",
        ) from None

    if completed_at.tzinfo is None or completed_at.utcoffset() is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "备份状态时间缺少时区",
        )
    return completed_at.astimezone(timezone.utc)


@router.get("/livez")
def livez():
    return {"ok": True}


@router.get("/healthz")
def healthz():
    get_recruitment_config()
    database_path = get_database_path()
    try:
        connection = sqlite3.connect(
            f"{database_path.as_uri()}?mode=ro",
            uri=True,
            timeout=5,
        )
        try:
            connection.execute("SELECT 1").fetchone()
        finally:
            connection.close()
    except sqlite3.Error as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "数据库健康检查失败",
        ) from exc
    return {"ok": True}


@router.get("/ops/backupz")
def backupz():
    completed_at = read_last_successful_backup()
    age = datetime.now(timezone.utc) - completed_at
    if age < timedelta(0) or age > MAX_BACKUP_AGE:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "最近一次成功备份已超过 30 小时",
        )
    return {"ok": True, "completedAt": completed_at.isoformat()}
