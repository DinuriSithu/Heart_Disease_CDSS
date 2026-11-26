
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal


class PatientData(BaseModel):
    model_config = ConfigDict(
        extra="forbid"
    )

    Age: int = Field(
        ge=18,
        le=100,
        description="Patient age in years"
    )

    RestingBP: int = Field(
        ge=60,
        le=250,
        description="Resting blood pressure (mm Hg)"
    )

    Cholesterol: int = Field(
        ge=0,
        le=700,
        description="Serum cholesterol (mg/dl). Zero represents the dataset's missing-value convention."
    )

    MaxHR: int = Field(
        ge=60,
        le=250,
        description="Maximum heart rate achieved"
    )

    Oldpeak: float = Field(
        ge=-3.0,
        le=7.0,
        description="ST depression value"
    )

    Sex: Literal["M", "F"]

    ChestPainType: Literal[
        "TA", "ATA", "NAP", "ASY"
    ]

    FastingBS: Literal[0, 1]

    RestingECG: Literal[
        "Normal", "ST", "LVH"
    ]

    ExerciseAngina: Literal["Y", "N"]

    ST_Slope: Literal[
        "Up", "Flat", "Down"
    ]


class PredictionResponse(BaseModel):

    predicted_class: int

    probability_class_0: float

    probability_class_1: float

    shap_explanations: list[dict]
