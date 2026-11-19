
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CreatePatientRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_reference: str = Field(
        min_length=1,
        max_length=100,
    )

    full_name: str = Field(
        min_length=1,
        max_length=150,
    )

    date_of_birth: datetime | None = None

    sex: str | None = Field(
        default=None,
        pattern="^[MF]$",
    )

    medical_history: str | None = None
    family_history: str | None = None
    medications: str | None = None
    allergies: str | None = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    patient_reference: str
    full_name: str
    date_of_birth: datetime | None
    sex: str | None
    medical_history: str | None
    family_history: str | None
    medications: str | None
    allergies: str | None
    created_at: datetime
