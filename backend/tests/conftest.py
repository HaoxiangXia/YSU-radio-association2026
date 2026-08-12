import copy
import json
import os
import sys
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_PASSWORD = "test-password"

# These must exist before importing app/routes because JWT_SECRET is read at import time.
os.environ.setdefault("JWT_SECRET", "test-only-jwt-secret-with-at-least-32-characters")
os.environ.setdefault("OFFICER_USERNAME", "officer")
os.environ.setdefault("OFFICER_PASSWORD", TEST_PASSWORD)

from fastapi.testclient import TestClient

from app import app
from config.recruitment import reset_recruitment_config
from models.admission_list import reset_admissions_data
from routes.admissions import reset_preview_sessions
from utils.security import (
    admission_query_limiter,
    application_submit_limiter,
    login_limiter,
)


def make_config(
    *,
    application_enabled: bool = True,
    admission_enabled: bool = True,
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "cycle": "test-cycle",
        "application": {
            "enabled": application_enabled,
            "startsAt": (now - timedelta(days=1)).isoformat(),
            "endsAt": (now + timedelta(days=1)).isoformat(),
            "privacyNotice": "测试资料仅用于自动化验证。",
            "crossBorderNotice": "测试资料存储在中国香港的测试服务器。",
            "retentionUntil": "2099-12-31",
        },
        "admissionQuery": {
            "enabled": admission_enabled,
        },
        "contact": {
            "label": "测试联系方式",
            "qq": "10000",
            "channelText": "仅用于自动化测试",
        },
        "options": {
            "colleges": ["信息科学与工程学院", "机械工程学院"],
            "grades": ["2026级", "2025级"],
        },
        "site": {"icpNumber": ""},
    }


def make_admissions() -> list[dict]:
    return [
        {
            "studentId": "202600000001",
            "name": "测试同学",
            "phone": "13800000001",
            "department": "嵌入式部门",
            "status": "已录取",
        }
    ]


def make_application(student_id: str = "202600000002", **overrides) -> dict:
    application = {
        "name": "测试申请人",
        "studentId": student_id,
        "college": "信息科学与工程学院",
        "grade": "2026级",
        "phone": "13800000002",
        "email": "student@example.test",
        "self_introduction": "这是用于自动化测试的自我介绍内容。",
        "expectation": "希望学习无线电相关知识。",
        "privacyAccepted": True,
    }
    application.update(overrides)
    return application


def reset_runtime_state() -> None:
    reset_recruitment_config()
    reset_admissions_data()
    reset_preview_sessions()
    login_limiter._windows.clear()
    application_submit_limiter._windows.clear()
    admission_query_limiter._windows.clear()


@pytest.fixture
def client_factory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    counter = 0

    @contextmanager
    def factory(
        *,
        config: dict | None = None,
        admissions: list[dict] | None = None,
        database_path: Path | None = None,
    ):
        nonlocal counter
        counter += 1
        config_path = tmp_path / f"recruitment-{counter}.json"
        admissions_path = tmp_path / f"admissions-{counter}.json"
        db_path = database_path or (tmp_path / f"database-{counter}.sqlite")

        config_path.write_text(
            json.dumps(config or make_config(), ensure_ascii=False),
            encoding="utf-8",
        )
        admissions_path.write_text(
            json.dumps(
                admissions if admissions is not None else make_admissions(),
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        monkeypatch.setenv("RECRUITMENT_CONFIG_PATH", str(config_path))
        monkeypatch.setenv("ADMISSIONS_DATA_PATH", str(admissions_path))
        monkeypatch.setenv("DATABASE_PATH", str(db_path))
        monkeypatch.setenv("OFFICER_USERNAME", "officer")
        monkeypatch.setenv("OFFICER_PASSWORD", TEST_PASSWORD)
        reset_runtime_state()

        try:
            # 会话 Cookie 带 Secure 属性：httpx cookie jar 只在 https 下回传
            with TestClient(app, base_url="https://testserver") as client:
                yield client, {
                    "config_path": config_path,
                    "admissions_path": admissions_path,
                    "database_path": db_path,
                }
        finally:
            reset_runtime_state()

    return factory


@pytest.fixture
def default_client(client_factory):
    with client_factory() as value:
        yield value


@pytest.fixture
def config_copy():
    return lambda **kwargs: copy.deepcopy(make_config(**kwargs))
