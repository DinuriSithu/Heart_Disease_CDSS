
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_DIR = BASE_DIR / "ml_models"


# 1. LOAD SAVED ML COMPONENTS

preprocessor = joblib.load(
    MODEL_DIR / "preprocessor.pkl"
)

feature_selector = joblib.load(
    MODEL_DIR / "feature_selector.pkl"
)

xgb_model = joblib.load(
    MODEL_DIR / "xgboost_model.pkl"
)

selected_features = joblib.load(
    MODEL_DIR / "selected_features.pkl"
)

shap_explainer = joblib.load(
    MODEL_DIR / "shap_explainer.pkl"
)


# 2. VERIFY LOADED COMPONENTS


assert len(selected_features) == xgb_model.n_features_in_

assert list(xgb_model.feature_names_in_) == selected_features

print("ML components loaded successfully.")



# 3. PREDICTION FUNCTION

def predict_heart_disease(patient_data: dict):

    patient_df = pd.DataFrame([patient_data])

    patient_df["MaxHR_Age_Ratio"] = (
        patient_df["MaxHR"] / patient_df["Age"]
    )

    processed_data = preprocessor.transform(patient_df)

    feature_names = preprocessor.get_feature_names_out()

    processed_df = pd.DataFrame(
        processed_data,
        columns=feature_names
    )

    patient_selected = processed_df[selected_features]

    predicted_class = int(
        xgb_model.predict(patient_selected)[0]
    )

    probabilities = xgb_model.predict_proba(
        patient_selected
    )[0]

    shap_values = shap_explainer(patient_selected)

    contributions = shap_values.values[0]

    shap_explanations = []

    for index, feature in enumerate(selected_features):

        shap_explanations.append({
            "feature": feature,
            "feature_value": float(
                patient_selected.iloc[0, index]
            ),
            "shap_value": float(
                contributions[index]
            )
        })

    shap_explanations.sort(
        key=lambda item: abs(item["shap_value"]),
        reverse=True
    )

    return {
        "predicted_class": predicted_class,
        "probability_class_0": float(probabilities[0]),
        "probability_class_1": float(probabilities[1]),
        "shap_explanations": shap_explanations
    }
