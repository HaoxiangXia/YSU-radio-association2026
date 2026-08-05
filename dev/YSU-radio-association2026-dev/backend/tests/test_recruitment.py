import json
from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from conftest import TEST_PASSWORD
from config.recruitment import (
    RecruitmentConfig,
    RecruitmentConfigError,
    get_application_status,
)


def login(client):
    response = client.post(
        "/api/recruitment-officers/login",
        json={"username": "officer", "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_public_config_excludes_private_fields(default_client):
    client, _ = default_client
    response = client.get("/api/recruitment/config")

    assert response.status_code == 200
    body = response.json()
    assert body["application"]["status"] == "open"
    assert body["admissionQuery"]["enabled"] is True
    assert "crossBorderNotice" not in body["application"]
    assert "retentionUntil" not in body["application"]
    assert "path" not in json.dumps(body).lower()


@pytest.mark.parametrize(
    ("enabled", "start_delta", "end_delta", "expected"),
    [
        (False, -1, 1, "manually_closed"),
        (True, 1, 2, "scheduled"),
        (True, -1, 1, "open"),
        (True, -2, -1, "ended"),
    ],
)
def test_application_statuses(
    config_copy,
    enabled,
    start_delta,
    end_delta,
    expected,
):
    now = datetime.now(timezone.utc)
    raw = config_copy(application_enabled=enabled)
    raw["application"]["startsAt"] = (now + timedelta(hours=start_delta)).isoformat()
    raw["application"]["endsAt"] = (now + timedelta(hours=end_delta)).isoformat()
    config = RecruitmentConfig.model_validate(raw)

    assert get_application_status(config, now=now) == expected


def test_application_end_is_exclusive(config_copy):
    boundary = datetime.now(timezone.utc)
    raw = config_copy()
    raw["application"]["startsAt"] = (boundary - timedelta(hours=1)).isoformat()
    raw["application"]["endsAt"] = boundary.isoformat()
    config = RecruitmentConfig.model_validate(raw)

    assert get_application_status(config, now=boundary) == "ended"


@pytest.mark.parametrize(
    "mutate",
    [
        lambda raw: raw["application"].update({"startsAt": None}),
        lambda raw: raw["application"].update(
            {"startsAt": "2026-01-01T00:00:00", "endsAt": "2026-02-01T00:00:00"}
        ),
        lambda raw: raw["options"].update({"grades": ["2026级", "2026级"]}),
        lambda raw: raw.update({"unexpected": True}),
    ],
)
def test_invalid_config_stops_startup(client_factory, config_copy, mutate):
    raw = config_copy()
    mutate(raw)

    with pytest.raises((RecruitmentConfigError, ValidationError)):
        with client_factory(config=raw):
            pass


def test_managed_config_requires_authentication(default_client, config_copy):
    client, _ = default_client

    assert client.get("/api/recruitment/manage/config").status_code == 401
    assert client.put(
        "/api/recruitment/manage/config",
        json=config_copy(),
    ).status_code == 401


def test_officer_can_atomically_update_business_config(default_client, config_copy):
    client, state = default_client
    headers = login(client)
    updated = config_copy()
    updated["application"]["notice"] = "更新后的招新通知"
    updated["contact"]["channelText"] = "更新后的联系说明"

    response = client.put(
        "/api/recruitment/manage/config",
        headers=headers,
        json=updated,
    )
    public = client.get("/api/recruitment/config")
    persisted = json.loads(state["config_path"].read_text(encoding="utf-8"))

    assert response.status_code == 200
    assert "application.notice" in response.json()["changedFields"]
    assert public.json()["application"]["notice"] == "更新后的招新通知"
    assert persisted["contact"]["channelText"] == "更新后的联系说明"
    assert list(state["config_path"].parent.glob("*.previous.*"))
