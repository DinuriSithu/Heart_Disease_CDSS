
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import require_role
from app.schemas import PatientData, PredictionResponse
from app.services.assessment_validation import (
    prepare_assessment_data,
)
from app.services.ml_service import predict_heart_disease


router = APIRouter(
    prefix="/api/prediction",
    tags=["Heart Disease Prediction"],
)


class PredictionRequest(BaseModel):
    patient_id: int
    patient_data: PatientData


@router.post("/", response_model=PredictionResponse)
def predict(
    request: PredictionRequest,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_role("doctor"))],
):
    _, patient_data = prepare_assessment_data(
        patient_id=request.patient_id,
        doctor_id=doctor.id,
        patient_data=request.patient_data.model_dump(),
        db=db,
    )

    try:
        return predict_heart_disease(patient_data)

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Prediction could not be generated.",
        ) from error
