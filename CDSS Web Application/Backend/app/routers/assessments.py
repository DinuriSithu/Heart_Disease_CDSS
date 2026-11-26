from datetime import datetime, timezone
from math import isclose
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.assessment import PatientAssessment
from app.models.patient import Patient
from app.models.user import User
from app.routers.auth import require_role
from app.schemas_assessment import (
    SaveAssessmentRequest, SavedAssessmentResponse,
    AssessmentDetailResponse, AssessmentDashboardResponse, EvidenceAttachment,
)
from app.services.ml_service import predict_heart_disease
from app.services.assessment_validation import prepare_assessment_data

router = APIRouter(prefix="/api/assessments", tags=["Patient Assessments"])


def get_owned_patient(patient_id: int, doctor_id: int, db: Session) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.doctor_id == doctor_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return patient


def get_owned_assessment(assessment_id: int, doctor_id: int, db: Session) -> PatientAssessment:
    assessment = db.query(PatientAssessment).filter(PatientAssessment.id == assessment_id, PatientAssessment.doctor_id == doctor_id).first()
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return assessment


def evidence_snapshot(attachment, patient_id, patient_data, prediction):
    if attachment is None:
        return None
    if (attachment.patient_id != patient_id
        or attachment.patient_data.model_dump() != patient_data
        or attachment.predicted_class != prediction["predicted_class"]
        or not isclose(attachment.probability_class_0, prediction["probability_class_0"], abs_tol=1e-7)
        or not isclose(attachment.probability_class_1, prediction["probability_class_1"], abs_tol=1e-7)):
        raise HTTPException(status_code=409, detail="Evidence does not match the assessment. Generate a new prediction and retrieve evidence again.")
    evidence = attachment.medical_evidence.model_dump(mode="json")
    evidence["saved_at"] = datetime.now(timezone.utc).isoformat()
    evidence["provenance"] = "client_submitted_rag_response"
    return evidence


@router.post("/", response_model=SavedAssessmentResponse, status_code=201)
def save_assessment(request: SaveAssessmentRequest, db: Annotated[Session, Depends(get_db)], doctor: Annotated[User, Depends(require_role("doctor"))]):
    if request.patient_id is None:
        raise HTTPException(status_code=422, detail="A registered patient must be selected before saving an assessment.")
    patient, patient_data = prepare_assessment_data(patient_id=request.patient_id, doctor_id=doctor.id, patient_data=request.patient_data.model_dump(), db=db)
    if request.patient_reference.strip() != patient.patient_reference:
        raise HTTPException(status_code=422, detail="Patient reference does not match the selected patient.")
    try:
        prediction = predict_heart_disease(patient_data)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="Assessment could not be generated.") from error
    evidence = evidence_snapshot(request.evidence_attachment, patient.id, patient_data, prediction)
    assessment = PatientAssessment(doctor_id=doctor.id, patient_id=patient.id, patient_reference=patient.patient_reference, patient_data=patient_data, predicted_class=prediction["predicted_class"], probability_class_0=prediction["probability_class_0"], probability_class_1=prediction["probability_class_1"], shap_explanations=prediction["shap_explanations"], medical_evidence=evidence)
    try:
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail="Assessment could not be saved.") from error
    return assessment


@router.patch("/{assessment_id}/medical-evidence", response_model=AssessmentDetailResponse)
def attach_medical_evidence(assessment_id: int, request: EvidenceAttachment, db: Annotated[Session, Depends(get_db)], doctor: Annotated[User, Depends(require_role("doctor"))]):
    assessment = db.query(PatientAssessment).filter(PatientAssessment.id == assessment_id, PatientAssessment.doctor_id == doctor.id).with_for_update().first()
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    if assessment.medical_evidence is not None:
        raise HTTPException(status_code=409, detail="Medical evidence is already saved for this assessment.")
    assessment.medical_evidence = evidence_snapshot(request, assessment.patient_id, assessment.patient_data, {"predicted_class": assessment.predicted_class, "probability_class_0": assessment.probability_class_0, "probability_class_1": assessment.probability_class_1})
    try:
        db.commit()
        db.refresh(assessment)
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail="Medical evidence could not be saved.") from error
    return assessment


@router.get("/", response_model=list[SavedAssessmentResponse])
def get_assessment_history(db: Annotated[Session, Depends(get_db)], doctor: Annotated[User, Depends(require_role("doctor"))]):
    return db.query(PatientAssessment).filter(PatientAssessment.doctor_id == doctor.id).order_by(PatientAssessment.created_at.desc(), PatientAssessment.id.desc()).all()


@router.get("/dashboard", response_model=AssessmentDashboardResponse)
def get_assessment_dashboard(db: Annotated[Session, Depends(get_db)], doctor: Annotated[User, Depends(require_role("doctor"))]):
    assessments = db.query(PatientAssessment).filter(PatientAssessment.doctor_id == doctor.id).order_by(PatientAssessment.created_at.desc(), PatientAssessment.id.desc()).all()
    daily_counts = {}
    for item in assessments:
        date = item.created_at.date().isoformat()
        daily_counts[date] = daily_counts.get(date, 0) + 1
    return {"total_assessments": len(assessments), "heart_disease_indicated": sum(1 for item in assessments if item.predicted_class == 1), "heart_disease_not_indicated": sum(1 for item in assessments if item.predicted_class == 0), "recent_assessments": assessments[:5], "activity": [{"date": date, "count": count} for date, count in sorted(daily_counts.items())]}


@router.get("/patient/{patient_id}", response_model=list[SavedAssessmentResponse])
def get_patient_assessments(patient_id: int, db: Annotated[Session, Depends(get_db)], doctor: Annotated[User, Depends(require_role("doctor"))]):
    get_owned_patient(patient_id, doctor.id, db)
    return db.query(PatientAssessment).filter(PatientAssessment.patient_id == patient_id, PatientAssessment.doctor_id == doctor.id).order_by(PatientAssessment.created_at.desc(), PatientAssessment.id.desc()).all()


@router.get("/{assessment_id}", response_model=AssessmentDetailResponse)
def get_assessment_details(assessment_id: int, db: Annotated[Session, Depends(get_db)], doctor: Annotated[User, Depends(require_role("doctor"))]):
    return get_owned_assessment(assessment_id, doctor.id, db)


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: int, db: Annotated[Session, Depends(get_db)], doctor: Annotated[User, Depends(require_role("doctor"))]):
    assessment = get_owned_assessment(assessment_id, doctor.id, db)
    try:
        db.delete(assessment)
        db.commit()
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail="Assessment could not be deleted.") from error
    return None
