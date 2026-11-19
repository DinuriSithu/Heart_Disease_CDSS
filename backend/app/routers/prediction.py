from fastapi import APIRouter, HTTPException

from app.schemas import PatientData, PredictionResponse
from app.services.ml_service import predict_heart_disease


router = APIRouter(
    prefix="/api/prediction",
    tags=["Heart Disease Prediction"]
)


@router.post("/", response_model=PredictionResponse)
def predict(patient: PatientData):
    try:
        patient_data = patient.model_dump()

        result = predict_heart_disease(patient_data)

        return result

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Prediction could not be generated."
        ) from error