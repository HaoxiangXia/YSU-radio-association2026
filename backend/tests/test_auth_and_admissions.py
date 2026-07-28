from datetime import datetime, timedelta, timezone

import jwt

from conftest import TEST_PASSWORD
from routes import recruitment_officers
from routes.admissions import AdmissionDataError
from utils.security import admission_query_limiter, login_limiter


def test_login_success_verify_and_wrong_password(default_client):
    client, _ = default_client

    wrong = client.post(
        "/api/recruitment-officers/login",
        json={"username": "officer", "password": "wrong"},
    )
    success = client.post(
        "/api/recruitment-officers/login",
        json={"username": "officer", "password": TEST_PASSWORD},
    )
    token = success.json()["token"]
    verified = client.get(
        "/api/recruitment-officers/verify",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert wrong.status_code == 401
    assert success.status_code == 200
    assert verified.status_code == 200
    assert verified.json()["officer"]["username"] == "officer"


def test_successful_login_clears_failure_budget(default_client):
    client, _ = default_client
    payload = {"username": "officer", "password": "wrong"}
    for _ in range(4):
        assert client.post("/api/recruitment-officers/login", json=payload).status_code == 401

    assert client.post(
        "/api/recruitment-officers/login",
        json={"username": "officer", "password": TEST_PASSWORD},
    ).status_code == 200

    for _ in range(5):
        assert client.post("/api/recruitment-officers/login", json=payload).status_code == 401
    assert client.post("/api/recruitment-officers/login", json=payload).status_code == 429
    login_limiter.clear("testclient")


def test_expired_and_invalid_tokens_are_rejected(default_client):
    client, _ = default_client
    expired = jwt.encode(
        {
            "recruitmentOfficerId": "officer",
            "username": "officer",
            "name": "测试负责人",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        },
        recruitment_officers.JWT_SECRET,
        algorithm="HS256",
    )

    expired_response = client.get(
        "/api/recruitment-officers/verify",
        headers={"Authorization": f"Bearer {expired}"},
    )
    invalid_response = client.get(
        "/api/recruitment-officers/verify",
        headers={"Authorization": "Bearer not-a-token"},
    )

    assert expired_response.status_code == 401
    assert invalid_response.status_code == 403


def test_admission_query_success_and_privacy(default_client):
    client, _ = default_client
    response = client.post(
        "/api/admissions/query",
        json={"studentId": "202600000001", "phone": "13800000001"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "name": "测试同学",
        "department": "嵌入式部门",
        "status": "已录取",
    }
    assert "studentId" not in response.json()
    assert "phone" not in response.json()


def test_wrong_phone_and_unknown_student_are_indistinguishable(default_client):
    client, _ = default_client
    wrong_phone = client.post(
        "/api/admissions/query",
        json={"studentId": "202600000001", "phone": "13800000009"},
    )
    unknown = client.post(
        "/api/admissions/query",
        json={"studentId": "202600000009", "phone": "13800000009"},
    )

    assert wrong_phone.status_code == unknown.status_code == 404
    assert wrong_phone.json() == unknown.json()


def test_admission_query_closed(client_factory, config_copy):
    config = config_copy(admission_enabled=False)
    with client_factory(config=config) as (client, _):
        response = client.post(
            "/api/admissions/query",
            json={"studentId": "202600000001", "phone": "13800000001"},
        )

    assert response.status_code == 403
    assert response.json()["detail"] == config["admissionQuery"]["notice"]


def test_admission_rate_limit(default_client):
    client, _ = default_client
    payload = {"studentId": "202600000009", "phone": "13800000009"}

    for _ in range(20):
        assert client.post("/api/admissions/query", json=payload).status_code == 404
    assert client.post("/api/admissions/query", json=payload).status_code == 429
    admission_query_limiter.clear("testclient")


def test_private_admissions_file_is_not_public(default_client):
    client, _ = default_client
    for path in [
        "/data/admission-results.json",
        "/admission-results.json",
        "/config/recruitment.local.json",
    ]:
        assert client.get(path).status_code == 404


def test_invalid_admissions_file_stops_startup_without_echoing_private_value(
    client_factory,
):
    private_value = "13912345678"
    invalid_records = [
        {
            "studentId": "202600000001",
            "name": "测试同学",
            "phone": private_value,
            "department": "嵌入式部门",
            "status": "待定",
        }
    ]

    try:
        with client_factory(admissions=invalid_records):
            pass
    except AdmissionDataError as error:
        assert private_value not in str(error)
    else:
        raise AssertionError("无效录取名单没有阻止应用启动")
