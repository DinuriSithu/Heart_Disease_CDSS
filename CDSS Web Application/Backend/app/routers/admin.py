
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.assessment import PatientAssessment
from app.models.patient import Patient
from app.models.user import User
from app.routers.auth import require_role
from app.services.security import hash_password


router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(require_role("admin"))],
)


class CreateDoctorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class UpdateDoctorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
    email: EmailStr | None = None
    password: str | None = Field(
        default=None,
        min_length=12,
        max_length=128,
    )
    is_active: bool | None = None


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool


def get_doctor_or_404(
    db: Session,
    doctor_id: int,
) -> User:
    doctor = db.scalar(
        select(User).where(
            User.id == doctor_id,
            User.role == "doctor",
        )
    )

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor account not found.",
        )

    return doctor


@router.get(
    "/doctors",
    response_model=list[DoctorResponse],
)
def list_doctors(
    db: Annotated[Session, Depends(get_db)],
):
    return db.scalars(
        select(User)
        .where(User.role == "doctor")
        .order_by(User.id)
    ).all()


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
        select(User).where(
            func.lower(User.email) == email
        )
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

    try:
        db.add(doctor)
        db.commit()
        db.refresh(doctor)

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        ) from error

    return doctor


@router.patch(
    "/doctors/{doctor_id}",
    response_model=DoctorResponse,
)
def update_doctor(
    doctor_id: int,
    details: UpdateDoctorRequest,
    db: Annotated[Session, Depends(get_db)],
):
    doctor = get_doctor_or_404(db, doctor_id)

    changes = details.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=422,
            detail="No changes were provided.",
        )

    if "full_name" in changes:
        name = changes["full_name"]

        if name is None or len(name.strip()) < 2:
            raise HTTPException(
                status_code=422,
                detail="Doctor name must contain at least two characters.",
            )

        doctor.full_name = name.strip()

    if "email" in changes:
        supplied_email = changes["email"]

        if supplied_email is None:
            raise HTTPException(
                status_code=422,
                detail="Doctor email cannot be empty.",
            )

        email = str(supplied_email).strip().lower()

        existing_user = db.scalar(
            select(User).where(
                func.lower(User.email) == email,
                User.id != doctor.id,
            )
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        doctor.email = email

    if "password" in changes:
        new_password = changes["password"]

        if new_password is None:
            raise HTTPException(
                status_code=422,
                detail="New password cannot be empty.",
            )

        doctor.password_hash = hash_password(new_password)

    if "is_active" in changes:
        new_status = changes["is_active"]

        if new_status is None:
            raise HTTPException(
                status_code=422,
                detail="Account status must be true or false.",
            )

        doctor.is_active = new_status

    try:
        db.commit()
        db.refresh(doctor)

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to update doctor. Email may already exist.",
        ) from error

    return doctor


@router.delete(
    "/doctors/{doctor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_doctor(
    doctor_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    doctor = get_doctor_or_404(db, doctor_id)

    patient_count = (
        db.query(func.count(Patient.id))
        .filter(Patient.doctor_id == doctor.id)
        .scalar()
    ) or 0

    assessment_count = (
        db.query(func.count(PatientAssessment.id))
        .filter(PatientAssessment.doctor_id == doctor.id)
        .scalar()
    ) or 0

    if patient_count > 0 or assessment_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "This doctor has registered patients or saved "
                "assessments and cannot be permanently deleted. "
                "Deactivate the doctor account instead to "
                "preserve clinical records."
            ),
        )

    try:
        db.delete(doctor)
        db.commit()

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Doctor deletion is blocked by related "
                "database records. Deactivate the account instead."
            ),
        ) from error

    return None
