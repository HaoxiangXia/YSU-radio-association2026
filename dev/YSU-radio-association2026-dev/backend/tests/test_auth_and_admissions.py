import io
import json
import zipfile
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from openpyxl import Workbook

from conftest import TEST_PASSWORD
from routes import recruitment_officers
from routes.admissions import AdmissionDataError, parse_admission_workbook
from utils.security import admission_query_limiter, login_limiter


def login(client):
    response = client.post(
        "/api/recruitment-officers/login",
        json={"username": "officer", "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def workbook_bytes(*, formula: bool = False, extra_header: bool = False) -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "录取名单"
    headers = ["姓名", "学号", "申请手机号", "录取部门", "录取状态"]
    if extra_header:
        headers.append("备注")
    worksheet.append(headers)
    worksheet.append((
        "新同学",
        "202600000008",
        "13800000008",
        "机械部门",
        "=\"已录取\"" if formula else "已录取",
    ))
    output = io.BytesIO()
    workbook.save(output)
    workbook.close()
    return output.getvalue()


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


def test_admissions_management_requires_authentication(default_client):
    client, _ = default_client

    assert client.get("/api/admissions/manage/status").status_code == 401
    assert client.get("/api/admissions/manage/template.xlsx").status_code == 401
    assert client.post(
        "/api/admissions/manage/preview",
        content=workbook_bytes(),
    ).status_code == 401


def test_officer_can_preview_publish_and_then_open_query(client_factory, config_copy):
    config = config_copy(admission_enabled=False)
    with client_factory(config=config, admissions=[]) as (client, state):
        headers = login(client)
        template = client.get(
            "/api/admissions/manage/template.xlsx",
            headers=headers,
        )
        preview = client.post(
            "/api/admissions/manage/preview",
            headers={
                **headers,
                "Content-Type": (
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ),
            },
            content=workbook_bytes(),
        )
        publish = client.post(
            "/api/admissions/manage/publish",
            headers=headers,
            json={"previewId": preview.json()["previewId"]},
        )
        config["admissionQuery"]["enabled"] = True
        opened = client.put(
            "/api/recruitment/manage/config",
            headers=headers,
            json=config,
        )
        query = client.post(
            "/api/admissions/query",
            json={"studentId": "202600000008", "phone": "13800000008"},
        )
        persisted = json.loads(state["admissions_path"].read_text(encoding="utf-8"))

    assert template.status_code == 200
    assert template.content.startswith(b"PK")
    assert preview.status_code == 200
    assert preview.json()["valid"] is True
    assert preview.json()["preview"][0]["phone"] == "*******0008"
    assert publish.status_code == 200
    assert opened.status_code == 200
    assert query.status_code == 200
    assert query.json()["name"] == "新同学"
    assert persisted[0]["studentId"] == "202600000008"


def test_formula_is_rejected_and_publish_requires_closed_query(default_client):
    client, _ = default_client
    headers = login(client)
    invalid_preview = client.post(
        "/api/admissions/manage/preview",
        headers=headers,
        content=workbook_bytes(formula=True),
    )
    valid_preview = client.post(
        "/api/admissions/manage/preview",
        headers=headers,
        content=workbook_bytes(),
    )
    publish = client.post(
        "/api/admissions/manage/publish",
        headers=headers,
        json={"previewId": valid_preview.json()["previewId"]},
    )

    assert invalid_preview.status_code == 200
    assert invalid_preview.json()["valid"] is False
    assert invalid_preview.json()["errors"][0]["message"] == "不得使用公式"
    assert publish.status_code == 409
    assert "关闭录取查询" in publish.json()["detail"]


def test_extra_excel_columns_and_expanded_workbook_are_rejected(default_client):
    client, _ = default_client
    headers = login(client)
    extra_column = client.post(
        "/api/admissions/manage/preview",
        headers=headers,
        content=workbook_bytes(extra_header=True),
    )

    expanded = io.BytesIO()
    with zipfile.ZipFile(expanded, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/worksheets/sheet1.xml", b"0" * (21 * 1024 * 1024))

    with pytest.raises(AdmissionDataError, match="展开后过大"):
        parse_admission_workbook(expanded.getvalue())

    assert extra_column.status_code == 422
    assert "只能包含这些表头" in extra_column.json()["detail"]
