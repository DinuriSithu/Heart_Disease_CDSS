
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.routers.auth import require_role
from app.schemas_patient import (
    CreatePatientRequest,
    PatientResponse,
)


router = APIRouter(
    prefix="/api/patients",
    tags=["Patients"],
)


@router.post(
    "/",
    response_model=PatientResponse,
    status_code=201,
)
def create_patient(
    request: CreatePatientRequest,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):
    reference = request.patient_reference.strip()
    name = request.full_name.strip()

    if not reference or not name:
        raise HTTPException(
            status_code=422,
            detail="Patient reference and name are required.",
        )

    patient = Patient(
        **request.model_dump(
            exclude={"patient_reference", "full_name"}
        ),
        doctor_id=doctor.id,
        patient_reference=reference,
        full_name=name,
    )

    try:
        db.add(patient)
        db.commit()
        db.refresh(patient)

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A patient with this reference already exists.",
        ) from error

    return patient


@router.get(
    "/",
    response_model=list[PatientResponse],
)
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
    search: str = "",
):
    query = db.query(Patient).filter(
        Patient.doctor_id == doctor.id
    )

    search = search.strip()

    if search:
        query = query.filter(
            or_(
                Patient.patient_reference.ilike(
                    f"%{search}%"
                ),
                Patient.full_name.ilike(
                    f"%{search}%"
                ),
            )
        )

    return query.order_by(
        Patient.created_at.desc(),
        Patient.id.desc(),
    ).limit(100).all()


@router.get(
    "/{patient_id}",
    response_model=PatientResponse,
)
def get_patient(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):
    patient = (
        db.query(Patient)
        .filter(
            Patient.id == patient_id,
            Patient.doctor_id == doctor.id,
        )
        .first()
    )

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found.",
        )

    return patient
