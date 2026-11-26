
import joblib
import numpy as np
import pandas as pd

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]

MODEL_DIR = BASE_DIR / "ml_models"

print("Model directory:", MODEL_DIR)


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

print("\nAll five model files loaded successfully.")


print("\n--- COMPONENT VERIFICATION ---")

print("Preprocessor:", type(preprocessor).__name__)
print("Feature selector:", type(feature_selector).__name__)
print("XGBoost model:", type(xgb_model).__name__)
print("SHAP explainer:", type(shap_explainer).__name__)

print("Number of selected features:", len(selected_features))
print("XGBoost expected feature count:", xgb_model.n_features_in_)

assert feature_selector.prefit is True

assert hasattr(
    feature_selector.estimator,
    "feature_importances_"
)

assert len(selected_features) == xgb_model.n_features_in_

print("\nBasic component verification passed.")


all_feature_names = preprocessor.get_feature_names_out()

selector_feature_names = all_feature_names[
    feature_selector.get_support()
].tolist()

print("\nFeatures selected by feature selector:")
print(selector_feature_names)

print("\nFeatures loaded from selected_features.pkl:")
print(selected_features)

assert selector_feature_names == selected_features, (
    "The feature selector and saved feature list do not match."
)

assert list(xgb_model.feature_names_in_) == selected_features, (
    "The XGBoost feature names do not match the saved feature list."
)

print("\nFeature selection verification passed.")


patient_data = pd.DataFrame([{
    "Age": 55,
    "Sex": "M",
    "ChestPainType": "ATA",
    "RestingBP": 130,
    "Cholesterol": 240,
    "FastingBS": 0,
    "RestingECG": "Normal",
    "MaxHR": 150,
    "ExerciseAngina": "N",
    "Oldpeak": 1.0,
    "ST_Slope": "Up"
}])


patient_data["MaxHR_Age_Ratio"] = (
    patient_data["MaxHR"] /
    patient_data["Age"].replace(0, np.nan)
)

print("\n--- TEST INPUT ---")
print(patient_data)

processed_data = preprocessor.transform(patient_data)

processed_feature_names = preprocessor.get_feature_names_out()

processed_df = pd.DataFrame(
    processed_data,
    columns=processed_feature_names
)

print("\nProcessed data shape:", processed_df.shape)

assert processed_df.shape[1] == 21

print("Preprocessing completed successfully.")


patient_selected = processed_df[selected_features]

print("\nSelected patient data shape:", patient_selected.shape)

print("\nSelected features:")
print(patient_selected.columns.tolist())

assert patient_selected.shape[1] == 11

assert list(patient_selected.columns) == selected_features

print("\nFeature selection completed successfully.")


prediction = xgb_model.predict(patient_selected)

probability = xgb_model.predict_proba(patient_selected)

predicted_class = int(prediction[0])

probability_no_disease = float(probability[0, 0])

probability_heart_disease = float(probability[0, 1])

print("\n--- XGBOOST PREDICTION ---")

print("Predicted class:", predicted_class)

print(
    "Probability for class 0:",
    round(probability_no_disease, 4)
)

print(
    "Probability for class 1:",
    round(probability_heart_disease, 4)
)

assert predicted_class in [0, 1]
assert np.isclose(probability.sum(), 1.0)

print("\nXGBoost prediction completed successfully.")


shap_result = shap_explainer(patient_selected)

shap_values = np.asarray(shap_result.values)

print("\n--- SHAP EXPLANATION ---")

print("SHAP values shape:", shap_values.shape)

print("\nFeature contributions:")

contribution_df = pd.DataFrame({
    "Feature": selected_features,
    "Processed Feature Value": patient_selected.iloc[0].values,
    "SHAP Value": shap_values.reshape(-1)
})

contribution_df["Absolute SHAP Value"] = (
    contribution_df["SHAP Value"].abs()
)

contribution_df = contribution_df.sort_values(
    by="Absolute SHAP Value",
    ascending=False
)

print(contribution_df.to_string(index=False))

assert shap_values.size == len(selected_features)
assert np.isfinite(shap_values).all()

print("\nSHAP explanation generated successfully.")


print("\n" + "=" * 55)
print("COMPLETE CDSS PIPELINE TEST PASSED")
print("=" * 55)

print("1. Five saved files loaded successfully.")
print("2. Feature selector verified.")
print("3. Preprocessing completed.")
print("4. Selected features verified.")
print("5. XGBoost prediction generated.")
print("6. SHAP explanation generated.")

print("\nThe saved model pipeline is working technically.")
print("This test output is not a medical diagnosis.")
