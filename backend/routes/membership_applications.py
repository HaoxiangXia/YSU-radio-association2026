import csv
import io
import re
import sqlite3
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator

from config.database import get_db
from config.recruitment import (
    RecruitmentConfig,
    get_application_status,
    get_recruitment_config,
)
from models import membership_application as membership_application_model
from routes.recruitment_officers import get_current_recruitment_officer
from utils.security import application_submit_limiter, get_client_ip

router = APIRouter()


class MembershipApplicationCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    name: str = Field(min_length=2, max_length=30)
    student_id: str = Field(alias="studentId", pattern=r"^\d{12}$")
    college: str = Field(min_length=1, max_length=100)
    grade: str = Field(min_length=1, max_length=50)
    phone: str = Field(pattern=r"^1[3-9]\d{9}$")
    email: str = Field(min_length=3, max_length=254)
    self_introduction: str = Field(min_length=10, max_length=1000)
    expectation: Optional[str] = Field(default=None, max_length=500)
    privacy_accepted: StrictBool = Field(alias="privacyAccepted")
    cross_border_accepted: StrictBool = Field(alias="crossBorderAccepted")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("邮箱格式无效")
        return value

    @field_validator("expectation")
    @classmethod
    def normalize_empty_expectation(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("privacy_accepted")
    @classmethod
    def require_privacy_acceptance(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("必须确认隐私说明")
        return value

    @field_validator("cross_border_accepted")
    @classmethod
    def require_cross_border_acceptance(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("必须单独确认香港服务器存储说明")
        return value


class CreateResponse(BaseModel):
    message: str


CSV_COLUMNS = (
    ("name", "姓名"),
    ("studentId", "学号"),
    ("college", "学院"),
    ("grade", "年级"),
    ("phone", "联系电话"),
    ("email", "电子邮箱"),
    ("self_introduction", "自我介绍"),
    ("expectation", "加入期望"),
    ("createdAt", "提交时间"),
)


def safe_csv_value(value) -> str:
    text = "" if value is None else str(value)
    if re.match(r"^\s*[=+\-@\t\r]", text):
        return f"'{text}"
    return text


@router.post("", response_model=CreateResponse, status_code=status.HTTP_201_CREATED)
def create_membership_application(
    data: MembershipApplicationCreate,
    request: Request,
    db=Depends(get_db),
    recruitment_config: RecruitmentConfig = Depends(get_recruitment_config),
):
    application_status = get_application_status(recruitment_config)
    if application_status != "open":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            recruitment_config.application.notice,
        )

    if data.college not in recruitment_config.options.colleges:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "学院选项无效")
    if data.grade not in recruitment_config.options.grades:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "年级选项无效")

    client_key = get_client_ip(request)
    if not application_submit_limiter.is_allowed(client_key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "提交过于频繁，请稍后再试",
        )
    try:
        membership_application_model.create(
            db,
            data.model_dump(
                by_alias=True,
                exclude={"privacy_accepted", "cross_border_accepted"},
            ),
        )
    except sqlite3.IntegrityError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "该学号已提交过入会申请，如需更正请联系招新负责人",
        )
    except sqlite3.Error:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "提交入会申请失败，请稍后再试",
        )
    return {"message": "入会申请提交成功"}


@router.get("")
def list_membership_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    college: Optional[str] = None,
    grade: Optional[str] = None,
    search: Optional[str] = None,
    sortBy: str = "createdAt",
    sortOrder: str = "desc",
    db=Depends(get_db),
    officer=Depends(get_current_recruitment_officer),
):
    result = membership_application_model.find_all(
        db, page=page, limit=limit, college=college, grade=grade,
        search=search, sort_by=sortBy, sort_order=sortOrder,
    )
    return {
        "membership_applications": result["membership_applications"],
        "pagination": {
            "current": page,
            "total": (result["total"] + limit - 1) // limit,
            "count": result["total"],
        },
    }


@router.get("/stats")
def get_stats(db=Depends(get_db), officer=Depends(get_current_recruitment_officer)):
    total = membership_application_model.count(db)

    today = datetime.now().strftime("%Y-%m-%dT00:00:00.000Z")
    today_count = membership_application_model.count(db, query={"createdAt": {"$gte": today}})

    college_stats = membership_application_model.group_by_college(db)
    grade_stats = membership_application_model.group_by_grade(db)

    return {
        "total": total,
        "todayCount": today_count,
        "collegeCount": len(college_stats),
        "gradeCount": len(grade_stats),
        "collegeStats": college_stats,
        "gradeStats": grade_stats,
    }


@router.get("/export.csv")
def export_membership_applications(
    college: Optional[str] = None,
    grade: Optional[str] = None,
    search: Optional[str] = None,
    db=Depends(get_db),
    officer=Depends(get_current_recruitment_officer),
):
    items = membership_application_model.find_all_for_export(
        db,
        college=college,
        grade=grade,
        search=search,
    )
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow([label for _, label in CSV_COLUMNS])
    for item in items:
        writer.writerow(
            [safe_csv_value(item.get(key)) for key, _ in CSV_COLUMNS]
        )

    filename = f"membership-applications-{datetime.now():%Y-%m-%d}.csv"
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Export-Count": str(len(items)),
        },
    )


@router.get("/{membership_application_id}")
def get_membership_application(membership_application_id: int, db=Depends(get_db), officer=Depends(get_current_recruitment_officer)):
    row = membership_application_model.find_by_id(db, membership_application_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "未找到入会申请")
    return row


@router.delete("/{membership_application_id}")
def delete_membership_application(membership_application_id: int, db=Depends(get_db), officer=Depends(get_current_recruitment_officer)):
    row = membership_application_model.delete_by_id(db, membership_application_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "未找到入会申请")
    return {"message": "删除成功"}
