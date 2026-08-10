import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from utils.security import get_client_ip, login_limiter, verify_password

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET 环境变量未设置。请在 .env 中设置一个随机的 JWT 签名密钥。"
    )

security = HTTPBearer(auto_error=False)


class RecruitmentOfficerInfo(BaseModel):
    id: str
    username: str
    name: str


def load_recruitment_officer():
    username = os.environ.get("OFFICER_USERNAME")
    password_hash = os.environ.get("OFFICER_PASSWORD_HASH")
    if not username or not password_hash:
        raise RuntimeError(
            "OFFICER_USERNAME 或 OFFICER_PASSWORD_HASH 环境变量未设置。"
        )
    return {"username": username, "password": password_hash, "name": username}


def get_current_recruitment_officer(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少访问令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="访问令牌已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无效的访问令牌",
        )
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
def login(req: LoginRequest, request: Request):
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
        "iat": now,
        "exp": now + expires_delta,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return {
        "message": "登录成功",
        "token": token,
        "officer": {
            "id": officer["username"],
            "username": officer["username"],
            "name": officer["name"],
        },
    }


@router.get("/verify")
def verify(officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer)):
    return {"message": "Token有效", "officer": officer.model_dump()}


@router.post("/logout")
def logout(officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer)):
    return {"message": "注销成功"}


@router.get("/profile")
def profile(officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer)):
    return {"officer": officer.model_dump()}
