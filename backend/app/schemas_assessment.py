
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import PatientData


class SaveAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_id: int | None = Field(default=None, ge=1)

    patient_reference: str = Field(
        min_length=1,
        max_length=100,
    )

    patient_data: PatientData


class SavedAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    patient_reference: str

    predicted_class: int
    probability_class_0: float
    probability_class_1: float

    created_at: datetime


class AssessmentDetailResponse(SavedAssessmentResponse):
    patient_data: dict[str, Any]
    shap_explanations: list[dict[str, Any]]
    medical_evidence: dict[str, Any] | None = None


class AssessmentDashboardResponse(BaseModel):
    total_assessments: int
    heart_disease_indicated: int
    heart_disease_not_indicated: int
    recent_assessments: list[SavedAssessmentResponse]
    activity: list[dict[str, Any]]
