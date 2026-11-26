
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.assessment import PatientAssessment
from app.models.patient import Patient
from app.models.user import User
from app.routers.auth import require_role
from app.schemas_patient import (
    CreatePatientRequest,
    UpdatePatientRequest,
    PatientResponse,
)


router = APIRouter(
    prefix="/api/patients",
    tags=["Patients"],
)


def get_owned_patient(
    db: Session,
    patient_id: int,
    doctor_id: int,
) -> Patient:
    patient = (
        db.query(Patient)
        .filter(
            Patient.id == patient_id,
            Patient.doctor_id == doctor_id,
        )
        .first()
    )

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found.",
        )

    return patient


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

    return (
        query.order_by(
            Patient.created_at.desc(),
            Patient.id.desc(),
        )
        .limit(100)
        .all()
    )


@router.get("/dashboard/stats")
def get_patient_dashboard_stats(
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):
    total_patients = (
        db.query(func.count(Patient.id))
        .filter(Patient.doctor_id == doctor.id)
        .scalar()
    ) or 0

    heart_disease_assessments = (
        db.query(func.count(PatientAssessment.id))
        .filter(
            PatientAssessment.doctor_id == doctor.id,
            PatientAssessment.predicted_class == 1,
        )
        .scalar()
    ) or 0

    no_heart_disease_assessments = (
        db.query(func.count(PatientAssessment.id))
        .filter(
            PatientAssessment.doctor_id == doctor.id,
            PatientAssessment.predicted_class == 0,
        )
        .scalar()
    ) or 0

    return {
        "total_patients": total_patients,
        "heart_disease_assessments": heart_disease_assessments,
        "no_heart_disease_assessments": no_heart_disease_assessments,
    }


@router.get(
    "/{patient_id}",
    response_model=PatientResponse,
)
def get_patient(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):
    return get_owned_patient(
        db,
        patient_id,
        doctor.id,
    )


@router.patch(
    "/{patient_id}",
    response_model=PatientResponse,
)
def update_patient(
    patient_id: int,
    request: UpdatePatientRequest,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):
    patient = get_owned_patient(
        db,
        patient_id,
        doctor.id,
    )

    updates = request.model_dump(
        exclude_unset=True
    )

    if "full_name" in updates:
        name = updates["full_name"]

        if name is None or not name.strip():
            raise HTTPException(
                status_code=422,
                detail="Patient full name cannot be empty.",
            )

        updates["full_name"] = name.strip()

    for field in (
        "medical_history",
        "family_history",
        "medications",
        "allergies",
    ):
        if field in updates:
            value = updates[field]

            if isinstance(value, str):
                updates[field] = (
                    value.strip() or None
                )

    for field, value in updates.items():
        setattr(patient, field, value)

    try:
        db.commit()
        db.refresh(patient)

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Patient update conflicts with existing records.",
        ) from error

    return patient


@router.delete(
    "/{patient_id}",
    status_code=204,
)
def delete_patient(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):
    patient = get_owned_patient(
        db,
        patient_id,
        doctor.id,
    )

    linked_assessment = (
        db.query(PatientAssessment.id)
        .filter(
            PatientAssessment.doctor_id == doctor.id,
            or_(
                PatientAssessment.patient_id == patient.id,
                PatientAssessment.patient_reference
                == patient.patient_reference,
            ),
        )
        .first()
    )

    if linked_assessment is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "This patient has saved assessments and "
                "cannot be deleted. Clinical assessment "
                "records must be retained."
            ),
        )

    try:
        db.delete(patient)
        db.commit()

    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Patient deletion is blocked by "
                "related database records."
            ),
        ) from error

    return None
