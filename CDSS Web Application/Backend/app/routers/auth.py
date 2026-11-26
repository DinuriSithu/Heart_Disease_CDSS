
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import UserSession
from app.models.user import User
from app.services.security import verify_password


router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SESSION_COOKIE = "cdss_session"
SESSION_DURATION = timedelta(hours=8)

COOKIE_SECURE = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    token = request.cookies.get(SESSION_COOKIE)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    token_digest = hash_token(token)

    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_digest
        )
    )

    now = datetime.now(timezone.utc)

    if session is None or session.expires_at <= now:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid",
        )

    user = db.get(User, session.user_id)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Account unavailable",
        )

    return user


def require_role(*allowed_roles: str):
    def check_role(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions",
            )
        return user

    return check_role


@router.post("/login", response_model=UserResponse)
def login(
    credentials: LoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    email = credentials.email.lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(
            credentials.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + SESSION_DURATION

    db.add(
        UserSession(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=expires_at,
        )
    )
    db.commit()

    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=int(SESSION_DURATION.total_seconds()),
        path="/",
    )

    return user


@router.get("/me", response_model=UserResponse)
def get_my_profile(
    user: Annotated[User, Depends(get_current_user)],
):
    return user


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    token = request.cookies.get(SESSION_COOKIE)

    if token:
        session = db.scalar(
            select(UserSession).where(
                UserSession.token_hash == hash_token(token)
            )
        )

        if session:
            db.delete(session)
            db.commit()

    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        samesite="lax",
        secure=COOKIE_SECURE,
    )

    return {"message": "Logged out successfully"}
