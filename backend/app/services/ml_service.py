
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


# --------------------------------------------------
# 1. DEFINE MODEL DIRECTORY
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_DIR = BASE_DIR / "ml_models"


# --------------------------------------------------
# 2. LOAD SAVED ML COMPONENTS
# --------------------------------------------------

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


# --------------------------------------------------
# 3. VERIFY LOADED COMPONENTS
# --------------------------------------------------

assert len(selected_features) == xgb_model.n_features_in_

assert list(xgb_model.feature_names_in_) == selected_features

print("ML components loaded successfully.")


# --------------------------------------------------
# 4. PREDICTION FUNCTION
# --------------------------------------------------

def predict_heart_disease(patient_data: dict):

    # Convert input into a DataFrame
    patient_df = pd.DataFrame([patient_data])

    # Feature engineering
    patient_df["MaxHR_Age_Ratio"] = (
        patient_df["MaxHR"] / patient_df["Age"]
    )

    # Preprocessing
    processed_data = preprocessor.transform(patient_df)

    # Get feature names
    feature_names = preprocessor.get_feature_names_out()

    processed_df = pd.DataFrame(
        processed_data,
        columns=feature_names
    )

    # Select the features used by XGBoost
    patient_selected = processed_df[selected_features]

    # Generate prediction
    predicted_class = int(
        xgb_model.predict(patient_selected)[0]
    )

    # Generate probabilities
    probabilities = xgb_model.predict_proba(
        patient_selected
    )[0]

    # Generate SHAP explanation
    shap_values = shap_explainer(patient_selected)

    contributions = shap_values.values[0]

    # Prepare individual feature explanations
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

    # Sort explanations by absolute SHAP value
    shap_explanations.sort(
        key=lambda item: abs(item["shap_value"]),
        reverse=True
    )

    # Return prediction results
    return {
        "predicted_class": predicted_class,
        "probability_class_0": float(probabilities[0]),
        "probability_class_1": float(probabilities[1]),
        "shap_explanations": shap_explanations
    }
