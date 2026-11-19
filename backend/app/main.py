
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.patient import Patient

from app.routers import prediction, chat, auth, admin
from app.routers import assessments, patients


app = FastAPI(
    title="Clinical Decision Support System API",
    description="Heart Disease Prediction, SHAP and Medical Evidence API.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Existing clinical services
app.include_router(prediction.router)
app.include_router(chat.router)
app.include_router(assessments.router)

# New patient registry
app.include_router(patients.router)

# Existing authentication
app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "message": "Clinical Decision Support System API is running successfully.",
        "status": "Online",
    }


@app.get("/health")
def health_check():
    return {
        "status": "Healthy",
        "message": "Backend is working properly.",
    }
