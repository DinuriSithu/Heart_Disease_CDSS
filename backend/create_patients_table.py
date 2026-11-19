
from app.database import engine

from app.models.user import User
from app.models.patient import Patient


# Create the new patients table only.
# Existing tables and saved assessments are preserved.
Patient.__table__.create(
    bind=engine,
    checkfirst=True,
)

print("Patients table is ready.")
