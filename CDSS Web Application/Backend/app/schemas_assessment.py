from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from app.schemas import PatientData


class EvidenceSource(BaseModel):
    rank: int
    title: str = Field(max_length=2000)
    page: int | str | None = None
    url: str | None = Field(default=None, max_length=4000)
    excerpt: str = Field(default="", max_length=50000)
    summary: str | None = Field(default=None, max_length=50000)


class MedicalEvidence(BaseModel):
    question: str = Field(min_length=1, max_length=20000)
    answer: str = Field(min_length=1, max_length=100000)
    status: str = Field(max_length=200)
    sources: list[EvidenceSource] = Field(max_length=50)


class EvidenceAttachment(BaseModel):
    patient_id: int = Field(ge=1)
    patient_data: PatientData
    predicted_class: int = Field(ge=0, le=1)
    probability_class_0: float = Field(ge=0, le=1)
    probability_class_1: float = Field(ge=0, le=1)
    medical_evidence: MedicalEvidence


class SaveAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    patient_id: int | None = Field(default=None, ge=1)
    patient_reference: str = Field(min_length=1, max_length=100)
    patient_data: PatientData
    evidence_attachment: EvidenceAttachment | None = None


class SavedAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    doctor_id: int
    patient_id: int | None = None
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
