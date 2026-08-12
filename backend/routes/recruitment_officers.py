import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

from config.database import get_db, is_token_revoked, revoke_token
from utils.security import get_client_ip, login_limiter, verify_password

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET 环境变量未设置。请在 .env 中设置一个随机的 JWT 签名密钥。"
    )

# W-02：会话 token 只经 HttpOnly Cookie 传递，前端 JS 不可读，XSS 无法窃取
SESSION_COOKIE_NAME = "radio_officer_session"
SESSION_COOKIE_PATH = "/"
REMEMBER_SESSION_SECONDS = 7 * 24 * 3600


class RecruitmentOfficerInfo(BaseModel):
    id: str
    username: str
    name: str


def load_recruitment_officer():
    username = os.environ.get("OFFICER_USERNAME")
    password = os.environ.get("OFFICER_PASSWORD")
    if not username or not password:
        raise RuntimeError(
            "OFFICER_USERNAME 或 OFFICER_PASSWORD 环境变量未设置。"
        )
    return {"username": username, "password": password, "name": username}


def get_current_token_payload(
    request: Request,
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或登录已过期",
        )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无效的登录凭证",
        )
    jti = payload.get("jti")
    if not jti or is_token_revoked(db, jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已失效，请重新登录",
        )
    return payload


def get_current_recruitment_officer(
    payload: dict = Depends(get_current_token_payload),
) -> RecruitmentOfficerInfo:
    return RecruitmentOfficerInfo(
        id=payload.get("recruitmentOfficerId"),
        username=payload.get("username"),
        name=payload.get("name"),
    )


router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str
    remember: bool = False


@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response):
    if not req.username or not req.password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "用户名和密码不能为空")

    client_key = get_client_ip(request)
    if login_limiter.is_blocked(client_key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "登录尝试过于频繁，请稍后再试",
        )

    officer = load_recruitment_officer()
    password_ok = verify_password(req.password, officer["password"])
    if req.username != officer["username"] or not password_ok:
        login_limiter.record_failure(client_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "用户名或密码错误")

    login_limiter.clear(client_key)
    expires_delta = timedelta(days=7) if req.remember else timedelta(hours=24)
    now = datetime.now(timezone.utc)
    payload = {
        "recruitmentOfficerId": officer["username"],
        "username": officer["username"],
        "name": officer["name"],
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + expires_delta,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=REMEMBER_SESSION_SECONDS if req.remember else None,
        path=SESSION_COOKIE_PATH,
        httponly=True,
        secure=True,
        samesite="strict",
    )
    return {
        "message": "登录成功",
        "officer": {
            "id": officer["username"],
            "username": officer["username"],
            "name": officer["name"],
        },
    }


@router.get("/verify")
def verify(officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer)):
    return {"message": "登录状态有效", "officer": officer.model_dump()}


@router.post("/logout")
def logout(
    response: Response,
    payload: dict = Depends(get_current_token_payload),
    db: sqlite3.Connection = Depends(get_db),
):
    # 服务端吊销：注销后原会话立即失效，而不是仅前端删除凭证
    revoke_token(db, payload["jti"], int(payload["exp"]))
    response.delete_cookie(SESSION_COOKIE_NAME, path=SESSION_COOKIE_PATH)
    return {"message": "注销成功"}


@router.get("/profile")
def profile(officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer)):
    return {"officer": officer.model_dump()}
