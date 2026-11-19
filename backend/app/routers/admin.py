
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import require_role
from app.services.security import hash_password


router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(require_role("admin"))],
)


class CreateDoctorRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool


@router.get("/doctors", response_model=list[DoctorResponse])
def list_doctors(
    db: Annotated[Session, Depends(get_db)],
):
    doctors = db.scalars(
        select(User)
        .where(User.role == "doctor")
        .order_by(User.id)
    ).all()

    return doctors


@router.post(
    "/doctors",
    response_model=DoctorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_doctor(
    details: CreateDoctorRequest,
    db: Annotated[Session, Depends(get_db)],
):
    email = str(details.email).strip().lower()
    full_name = details.full_name.strip()

    if len(full_name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Doctor name must contain at least two characters.",
        )

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    doctor = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(details.password),
        role="doctor",
        is_active=True,
    )

    db.add(doctor)

    try:
        db.commit()
        db.refresh(doctor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    return doctor
