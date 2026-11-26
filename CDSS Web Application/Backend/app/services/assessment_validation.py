
from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.patient import Patient


def calculate_age(date_of_birth: datetime | date | None) -> int:
    if date_of_birth is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "The selected patient has no date of birth. "
                "Please update the patient profile before assessment."
            ),
        )

    birth_date = (
        date_of_birth.date()
        if isinstance(date_of_birth, datetime)
        else date_of_birth
    )

    today = datetime.now(timezone.utc).date()

    if birth_date > today:
        raise HTTPException(
            status_code=422,
            detail="The patient's date of birth cannot be in the future.",
        )

    age = today.year - birth_date.year

    if (today.month, today.day) < (
        birth_date.month,
        birth_date.day,
    ):
        age -= 1

    if not 18 <= age <= 100:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Calculated patient age is {age} years. "
                "This prediction model accepts ages from 18 to 100."
            ),
        )

    return age


def validate_clinical_data(
    patient_data: dict[str, Any],
) -> None:
    age = patient_data.get("Age")
    max_hr = patient_data.get("MaxHR")

    if (
        isinstance(age, bool)
        or not isinstance(age, int)
        or not 18 <= age <= 100
    ):
        raise HTTPException(
            status_code=422,
            detail="Age must be a whole number between 18 and 100.",
        )

    if (
        isinstance(max_hr, bool)
        or not isinstance(max_hr, int)
        or not 60 <= max_hr <= 250
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Maximum Heart Rate must be between "
                "60 and 250 bpm."
            ),
        )


def prepare_assessment_data(
    *,
    patient_id: int,
    doctor_id: int,
    patient_data: dict[str, Any],
    db: Session,
) -> tuple[Patient, dict[str, Any]]:
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
            detail="Selected patient not found.",
        )

    calculated_age = calculate_age(patient.date_of_birth)

    validated_data = dict(patient_data)
    validated_data["Age"] = calculated_age

    validate_clinical_data(validated_data)

    return patient, validated_data
