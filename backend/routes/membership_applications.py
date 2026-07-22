from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from pydantic import BaseModel
from config.database import get_db
from models import membership_application as membership_application_model
from routes.recruitment_officers import get_current_recruitment_officer
from utils.security import application_submit_limiter, get_client_ip

router = APIRouter()


class MembershipApplicationCreate(BaseModel):
    name: str
    studentId: str
    college: str
    grade: str
    phone: str
    email: str
    self_introduction: str
    expectation: Optional[str] = None


class CreateResponse(BaseModel):
    message: str


@router.post("", response_model=CreateResponse)
def create_membership_application(
    data: MembershipApplicationCreate,
    request: Request,
    db=Depends(get_db),
):
    client_key = get_client_ip(dict(request.headers))
    if not application_submit_limiter.is_allowed(client_key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "提交过于频繁，请稍后再试",
        )
    try:
        membership_application_model.create(db, data.model_dump())
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"提交入会申请失败：{e}")
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
