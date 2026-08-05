import logging
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

from config.recruitment import RecruitmentConfig, get_recruitment_config
from models.admission_list import (
    AdmissionDataError,
    AdmissionRecord,
    get_admissions,
    load_admissions,
    publish_admissions,
    resolve_admissions_path,
)
from routes.recruitment_officers import (
    RecruitmentOfficerInfo,
    get_current_recruitment_officer,
)
from utils.admission_workbook import (
    MAX_WORKBOOK_BYTES,
    create_admission_template,
    masked_preview,
    parse_admission_workbook,
)
from utils.security import admission_query_limiter, get_client_ip


router = APIRouter()
logger = logging.getLogger(__name__)

PREVIEW_TTL = timedelta(minutes=30)


class AdmissionQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, str_strip_whitespace=True)

    student_id: str = Field(alias="studentId", pattern=r"^\d{12}$")
    phone: str = Field(pattern=r"^1[3-9]\d{9}$")


class AdmissionQueryResponse(BaseModel):
    name: str
    department: str
    status: Literal["已录取", "未录取"]


class PublishAdmissionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    preview_id: str = Field(alias="previewId", min_length=32, max_length=64)


_previews: dict[str, dict] = {}
_preview_lock = threading.Lock()


def _cleanup_previews(now: datetime) -> None:
    expired = [
        preview_id
        for preview_id, preview in _previews.items()
        if now - preview["created_at"] > PREVIEW_TTL
    ]
    for preview_id in expired:
        _previews.pop(preview_id, None)


def _store_preview(records: list[AdmissionRecord], officer: RecruitmentOfficerInfo) -> str:
    preview_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    with _preview_lock:
        _cleanup_previews(now)
        _previews[preview_id] = {
            "created_at": now,
            "officer": officer.username,
            "records": records,
        }
    return preview_id


def _take_preview(preview_id: str, officer: RecruitmentOfficerInfo) -> list[AdmissionRecord]:
    now = datetime.now(timezone.utc)
    with _preview_lock:
        _cleanup_previews(now)
        preview = _previews.get(preview_id)
        if not preview or preview["officer"] != officer.username:
            raise AdmissionDataError("预览已失效，请重新上传并校验")
        return list(preview["records"])


def reset_preview_sessions() -> None:
    with _preview_lock:
        _previews.clear()


@router.post("/query", response_model=AdmissionQueryResponse)
def query_admission(
    query: AdmissionQuery,
    request: Request,
    config: RecruitmentConfig = Depends(get_recruitment_config),
):
    if not config.admission_query.enabled:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "录取查询尚未开放，请留意协会后续通知。",
        )

    client_key = get_client_ip(request)
    if not admission_query_limiter.is_allowed(client_key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "查询过于频繁，请稍后再试",
        )

    admission = get_admissions(config).get(query.student_id)
    if not admission or admission.phone != query.phone:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "未找到匹配的录取结果，请检查输入或联系协会负责人",
        )

    return AdmissionQueryResponse(
        name=admission.name,
        department=admission.department,
        status=admission.status,
    )


@router.get("/manage/status")
def managed_admissions_status(
    config: RecruitmentConfig = Depends(get_recruitment_config),
    officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer),
):
    admissions_path = resolve_admissions_path()
    if not admissions_path.exists():
        return {
            "published": False,
            "valid": True,
            "count": 0,
            "updatedAt": None,
            "queryEnabled": config.admission_query.enabled,
        }
    try:
        records = load_admissions(admissions_path)
    except AdmissionDataError:
        return {
            "published": True,
            "valid": False,
            "count": None,
            "updatedAt": datetime.fromtimestamp(
                admissions_path.stat().st_mtime,
                tz=timezone.utc,
            ),
            "queryEnabled": config.admission_query.enabled,
        }
    return {
        "published": True,
        "valid": True,
        "count": len(records),
        "updatedAt": datetime.fromtimestamp(
            admissions_path.stat().st_mtime,
            tz=timezone.utc,
        ),
        "queryEnabled": config.admission_query.enabled,
    }


@router.get("/manage/template.xlsx")
def download_admission_template(
    officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer),
):
    return Response(
        content=create_admission_template(),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": 'attachment; filename="admission-template.xlsx"',
        },
    )


@router.post("/manage/preview")
async def preview_admission_workbook(
    request: Request,
    officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer),
):
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_WORKBOOK_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Excel 文件不能超过 2 MiB")
    content = await request.body()
    try:
        result = parse_admission_workbook(content)
    except AdmissionDataError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    records = result["records"]
    errors = result["errors"]
    accepted_count = sum(record.status == "已录取" for record in records)
    rejected_count = sum(record.status == "未录取" for record in records)
    if errors:
        return {
            "valid": False,
            "previewId": None,
            "summary": {
                "total": len(records) + len(errors),
                "accepted": accepted_count,
                "rejected": rejected_count,
                "errors": len(errors),
            },
            "errors": errors[:50],
            "preview": [masked_preview(record) for record in records[:10]],
        }

    preview_id = _store_preview(records, officer)
    logger.info(
        "admissions_preview_created officer=%s count=%s",
        officer.username,
        len(records),
    )
    return {
        "valid": True,
        "previewId": preview_id,
        "summary": {
            "total": len(records),
            "accepted": accepted_count,
            "rejected": rejected_count,
            "errors": 0,
        },
        "errors": [],
        "preview": [masked_preview(record) for record in records[:10]],
    }


@router.post("/manage/publish")
def publish_previewed_admissions(
    data: PublishAdmissionsRequest,
    config: RecruitmentConfig = Depends(get_recruitment_config),
    officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer),
):
    if config.admission_query.enabled:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "请先关闭录取查询，再发布新的录取名单",
        )
    try:
        records = _take_preview(data.preview_id, officer)
        _, backup_path = publish_admissions(records)
    except AdmissionDataError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

    with _preview_lock:
        _previews.pop(data.preview_id, None)
    logger.info(
        "admissions_published officer=%s count=%s backup=%s",
        officer.username,
        len(records),
        bool(backup_path),
    )
    return {
        "message": "录取名单已发布，录取查询仍保持关闭",
        "count": len(records),
        "backupCreated": bool(backup_path),
    }
