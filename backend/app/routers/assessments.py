
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.assessment import PatientAssessment
from app.models.patient import Patient
from app.models.user import User
from app.routers.auth import require_role
from app.schemas_assessment import (
    SaveAssessmentRequest,
    SavedAssessmentResponse,
    AssessmentDetailResponse,
    AssessmentDashboardResponse,
)
from app.services.ml_service import predict_heart_disease


router = APIRouter(
    prefix="/api/assessments",
    tags=["Patient Assessments"],
)


# --------------------------------------------------
# 1. SAVE A NEW PATIENT ASSESSMENT
# --------------------------------------------------

@router.post(
    "/",
    response_model=SavedAssessmentResponse,
    status_code=201,
)
def save_assessment(
    request: SaveAssessmentRequest,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):

    # --------------------------------------------------
    # STEP 1: VERIFY THE SELECTED REGISTERED PATIENT
    # --------------------------------------------------

    patient = None

    if request.patient_id is not None:

        patient = (
            db.query(Patient)
            .filter(
                Patient.id == request.patient_id,
                Patient.doctor_id == doctor.id,
            )
            .first()
        )

        if patient is None:
            raise HTTPException(
                status_code=404,
                detail="Selected patient was not found.",
            )

        if (
            request.patient_reference.strip()
            != patient.patient_reference
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Patient reference does not match "
                    "the selected patient."
                ),
            )

    # --------------------------------------------------
    # STEP 2: GENERATE HEART DISEASE PREDICTION
    # --------------------------------------------------

    # Recalculate the prediction on the server.
    # Do not trust prediction results supplied by the browser.

    try:
        patient_data = request.patient_data.model_dump()

        prediction = predict_heart_disease(
            patient_data
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Assessment could not be generated.",
        ) from error

    # --------------------------------------------------
    # STEP 3: PREPARE THE ASSESSMENT RECORD
    # --------------------------------------------------

    assessment = PatientAssessment(
        doctor_id=doctor.id,

        # Link assessment to the registered patient.
        # Existing assessments can still have patient_id=None.
        patient_id=(
            patient.id
            if patient is not None
            else None
        ),

        patient_reference=request.patient_reference.strip(),

        patient_data=patient_data,

        predicted_class=prediction[
            "predicted_class"
        ],

        probability_class_0=prediction[
            "probability_class_0"
        ],

        probability_class_1=prediction[
            "probability_class_1"
        ],

        shap_explanations=prediction[
            "shap_explanations"
        ],

        medical_evidence=None,
    )

    # --------------------------------------------------
    # STEP 4: SAVE THE ASSESSMENT TO POSTGRESQL
    # --------------------------------------------------

    try:
        db.add(assessment)

        db.commit()

        db.refresh(assessment)

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Assessment could not be saved.",
        ) from error

    return assessment


# --------------------------------------------------
# 2. GET ASSESSMENT HISTORY
# --------------------------------------------------

@router.get(
    "/",
    response_model=list[SavedAssessmentResponse],
)
def get_assessment_history(
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):

    assessments = (
        db.query(PatientAssessment)
        .filter(
            PatientAssessment.doctor_id == doctor.id
        )
        .order_by(
            PatientAssessment.created_at.desc(),
            PatientAssessment.id.desc(),
        )
        .all()
    )

    return assessments


# --------------------------------------------------
# 3. GET DASHBOARD STATISTICS
# Must appear before /{assessment_id}
# --------------------------------------------------

@router.get(
    "/dashboard",
    response_model=AssessmentDashboardResponse,
)
def get_assessment_dashboard(
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):

    assessments = (
        db.query(PatientAssessment)
        .filter(
            PatientAssessment.doctor_id == doctor.id
        )
        .order_by(
            PatientAssessment.created_at.desc(),
            PatientAssessment.id.desc(),
        )
        .all()
    )

    indicated = sum(
        1
        for item in assessments
        if item.predicted_class == 1
    )

    not_indicated = sum(
        1
        for item in assessments
        if item.predicted_class == 0
    )

    daily_counts = {}

    for item in assessments:
        date = item.created_at.date().isoformat()

        daily_counts[date] = (
            daily_counts.get(date, 0) + 1
        )

    activity = [
        {
            "date": date,
            "count": count,
        }
        for date, count in sorted(
            daily_counts.items()
        )
    ]

    return {
        "total_assessments": len(assessments),
        "heart_disease_indicated": indicated,
        "heart_disease_not_indicated": not_indicated,
        "recent_assessments": assessments[:5],
        "activity": activity,
    }


# --------------------------------------------------
# 4. GET FULL DETAILS OF ONE ASSESSMENT
# --------------------------------------------------

@router.get(
    "/{assessment_id}",
    response_model=AssessmentDetailResponse,
)
def get_assessment_details(
    assessment_id: int,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):

    assessment = (
        db.query(PatientAssessment)
        .filter(
            PatientAssessment.id == assessment_id,
            PatientAssessment.doctor_id == doctor.id,
        )
        .first()
    )

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found.",
        )

    return assessment
