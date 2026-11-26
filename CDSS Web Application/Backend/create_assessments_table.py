
from app.database import Base, engine
from app.models.user import User
from app.models.assessment import PatientAssessment

PatientAssessment.__table__.create(
    bind=engine,
    checkfirst=True,
)

print("Patient assessments table is ready.")
