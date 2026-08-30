import csv
import io
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from conftest import TEST_PASSWORD, make_application


def login(client):
    response = client.post(
        "/api/recruitment-officers/login",
        json={"username": "officer", "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    # 会话经 Set-Cookie 写入 TestClient 的 cookie jar，后续请求自动携带


def seed_applications(database_path, count):
    with sqlite3.connect(database_path) as db:
        rows = []
        for index in range(count):
            rows.append(
                (
                    f"申请人{index:04d}",
                    f"{202600000100 + index:012d}",
                    "信息科学与工程学院" if index % 2 == 0 else "机械工程学院",
                    "2026级" if index % 3 else "2025级",
                    f"{13800000100 + index:011d}",
                    f"student{index}@example.test",
                    "这是自动化测试使用的自我介绍。",
                    "自动化测试加入期望",
                )
            )
        db.executemany(
            """
            INSERT INTO membership_applications
                (name, studentId, college, grade, phone, email,
                 self_introduction, expectation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        db.commit()


@pytest.mark.parametrize("state", ["manually_closed", "scheduled", "ended"])
def test_application_not_open(client_factory, config_copy, state):
    config = config_copy(application_enabled=state != "manually_closed")
    now = datetime.now(timezone.utc)
    if state == "scheduled":
        config["application"]["startsAt"] = (now + timedelta(hours=1)).isoformat()
        config["application"]["endsAt"] = (now + timedelta(hours=2)).isoformat()
    elif state == "ended":
        config["application"]["startsAt"] = (now - timedelta(hours=2)).isoformat()
        config["application"]["endsAt"] = (now - timedelta(hours=1)).isoformat()

    with client_factory(config=config) as (client, _):
        response = client.post(
            "/api/membership-applications",
            json=make_application(),
        )

    assert response.status_code == 403
    assert response.json()["detail"] == "入会申请当前未开放，请留意协会后续通知。"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "一"),
        ("studentId", "123"),
        ("college", "不存在的学院"),
        ("grade", "2099级"),
        ("phone", "12800000000"),
        ("email", "not-an-email"),
        ("self_introduction", "太短"),
        ("privacyAccepted", False),
    ],
)
def test_application_validation(default_client, field, value):
    client, _ = default_client
    response = client.post(
        "/api/membership-applications",
        json=make_application(**{field: value}),
    )
    assert response.status_code == 422


def test_unknown_field_is_rejected(default_client):
    client, _ = default_client
    payload = make_application()
    payload["internalNote"] = "不应接受"

    response = client.post("/api/membership-applications", json=payload)

    assert response.status_code == 422


def test_create_duplicate_and_privacy_not_persisted(default_client):
    client, state = default_client
    payload = make_application()

    first = client.post("/api/membership-applications", json=payload)
    duplicate = client.post("/api/membership-applications", json=payload)

    assert first.status_code == 201
    assert duplicate.status_code == 409
    with sqlite3.connect(state["database_path"]) as db:
        columns = {
            row[1]
            for row in db.execute("PRAGMA table_info(membership_applications)")
        }
        assert "privacyAccepted" not in columns
        assert "privacy_accepted" not in columns


def test_concurrent_duplicate_submission_has_single_winner(default_client):
    client, state = default_client
    payload = make_application(student_id="202600000003")

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(
            pool.map(
                lambda _: client.post("/api/membership-applications", json=payload),
                range(2),
            )
        )

    assert sorted(response.status_code for response in responses) == [201, 409]
    with sqlite3.connect(state["database_path"]) as db:
        count = db.execute(
            "SELECT COUNT(*) FROM membership_applications WHERE studentId = ?",
            (payload["studentId"],),
        ).fetchone()[0]
    assert count == 1


def test_application_persists_across_app_restart(client_factory, tmp_path):
    database_path = tmp_path / "persistent.sqlite"
    with client_factory(database_path=database_path) as (client, _):
        response = client.post(
            "/api/membership-applications",
            json=make_application(student_id="202600000004"),
        )
        assert response.status_code == 201

    with client_factory(database_path=database_path) as (client, _):
        login(client)
        response = client.get("/api/membership-applications")

    assert response.status_code == 200
    assert response.json()["pagination"]["count"] == 1

def test_operation_records_persist_across_app_restart(client_factory, tmp_path):
    database_path = tmp_path / "persistent-operation-records.sqlite"
    with client_factory(database_path=database_path) as (client, _):
        created = client.post(
            "/api/membership-applications",
            json=make_application(student_id="202600000005"),
        )
        assert created.status_code == 201
        login(client)
        applications = client.get("/api/membership-applications").json()
        application_id = applications["membership_applications"][0]["id"]
        deleted = client.delete(f"/api/membership-applications/{application_id}")
        assert deleted.status_code == 200

    with client_factory(database_path=database_path) as (client, _):
        login(client)
        records = client.get("/api/membership-applications/operation-records")

    assert records.status_code == 200
    assert records.json()["pagination"]["count"] == 1
    assert records.json()["operation_records"][0]["studentId"] == "202600000005"


def test_admin_pagination_filters_stats_detail_and_delete(default_client):
    client, state = default_client
    seed_applications(state["database_path"], 25)
    login(client)

    page = client.get("/api/membership-applications?page=2&limit=10")
    filtered = client.get(
        "/api/membership-applications?college=机械工程学院&grade=2026级&limit=100"
    )
    searched = client.get("/api/membership-applications?search=申请人0007")
    stats = client.get("/api/membership-applications/stats")

    assert page.status_code == 200
    assert len(page.json()["membership_applications"]) == 10
    assert page.json()["pagination"] == {"current": 2, "total": 3, "count": 25}
    assert filtered.status_code == 200
    assert all(
        row["college"] == "机械工程学院" and row["grade"] == "2026级"
        for row in filtered.json()["membership_applications"]
    )
    assert searched.json()["pagination"]["count"] == 1
    assert stats.json()["total"] == 25
    assert stats.json()["collegeCount"] == 2
    assert stats.json()["gradeCount"] == 2

    item_id = searched.json()["membership_applications"][0]["id"]
    detail = client.get(f"/api/membership-applications/{item_id}")
    deleted = client.delete(f"/api/membership-applications/{item_id}")
    missing = client.get(f"/api/membership-applications/{item_id}")
    duplicate_delete = client.delete(f"/api/membership-applications/{item_id}")
    records = client.get("/api/membership-applications/operation-records")

    assert detail.status_code == 200
    assert detail.json()["name"] == "申请人0007"
    assert deleted.status_code == 200
    assert missing.status_code == 404
    assert duplicate_delete.status_code == 404
    assert records.status_code == 200
    assert records.json()["pagination"]["count"] == 1
    record = records.json()["operation_records"][0]
    assert record["operation"] == "delete"
    assert record["membershipApplicationId"] == item_id
    assert record["applicationName"] == "申请人0007"
    assert record["studentId"] == "202600000107"
    assert record["recruitmentOfficerId"] == "officer"
    assert record["createdAt"]
    assert not {"phone", "email", "self_introduction", "expectation"} & record.keys()



def test_operation_records_are_paginated_in_reverse_creation_order(default_client):
    client, state = default_client
    seed_applications(state["database_path"], 3)
    login(client)
    applications = client.get("/api/membership-applications?limit=100").json()[
        "membership_applications"
    ]

    for application in applications:
        assert client.delete(f"/api/membership-applications/{application['id']}").status_code == 200

    first_page = client.get("/api/membership-applications/operation-records?page=1&limit=2")
    second_page = client.get("/api/membership-applications/operation-records?page=2&limit=2")

    assert first_page.status_code == 200
    assert first_page.json()["pagination"] == {"current": 1, "total": 2, "count": 3}
    assert [
        record["membershipApplicationId"]
        for record in first_page.json()["operation_records"]
    ] == [3, 2]
    assert [
        record["membershipApplicationId"]
        for record in second_page.json()["operation_records"]
    ] == [1]


def test_delete_rolls_back_when_operation_record_insert_fails(default_client):
    client, state = default_client
    seed_applications(state["database_path"], 1)
    with sqlite3.connect(state["database_path"]) as db:
        db.execute(
            """
            CREATE TRIGGER fail_operation_record_insert
            BEFORE INSERT ON membership_application_operation_records
            BEGIN
                SELECT RAISE(ABORT, 'operation record failure');
            END
            """
        )
        db.commit()

    login(client)
    deleted = client.delete("/api/membership-applications/1")
    application = client.get("/api/membership-applications/1")
    records = client.get("/api/membership-applications/operation-records")

    assert deleted.status_code == 500
    assert application.status_code == 200
    assert records.status_code == 200
    assert records.json()["pagination"]["count"] == 0

def test_admin_endpoints_require_authentication(default_client):
    client, _ = default_client
    for method, path in [
        ("get", "/api/membership-applications"),
        ("get", "/api/membership-applications/stats"),
        ("get", "/api/membership-applications/export.csv"),
        ("delete", "/api/membership-applications/1"),
        ("get", "/api/membership-applications/operation-records"),
    ]:
        response = getattr(client, method)(path)
        assert response.status_code == 401


def test_csv_exports_all_rows_with_bom_and_formula_protection(default_client):
    client, state = default_client
    seed_applications(state["database_path"], 1005)
    with sqlite3.connect(state["database_path"]) as db:
        db.execute(
            """
            UPDATE membership_applications
            SET name = ?, self_introduction = ?, expectation = ?
            WHERE id = 1
            """,
            ("  =2+2", "中文，逗号、\"引号\"与\n换行", "\t=CMD()"),
        )
        db.commit()

    login(client)
    response = client.get("/api/membership-applications/export.csv")

    assert response.status_code == 200
    assert response.content.startswith(b"\xef\xbb\xbf")
    assert response.headers["x-export-count"] == "1005"
    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    assert len(rows) == 1006
    exported = next(row for row in rows[1:] if "=2+2" in row[0])
    assert exported[0].startswith("'")
    assert exported[6] == "中文，逗号、\"引号\"与\n换行"
    assert exported[7].startswith("'")
