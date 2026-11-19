
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PatientAssessment(Base):
    __tablename__ = "patient_assessments"

    __table_args__ = (
        CheckConstraint(
            "predicted_class IN (0, 1)",
            name="ck_assessment_predicted_class",
        ),
        CheckConstraint(
            "probability_class_0 BETWEEN 0 AND 1",
            name="ck_assessment_probability_0",
        ),
        CheckConstraint(
            "probability_class_1 BETWEEN 0 AND 1",
            name="ck_assessment_probability_1",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    patient_id: Mapped[int | None] = mapped_column(
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    patient_reference: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    patient_data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    predicted_class: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    probability_class_0: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    probability_class_1: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    shap_explanations: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
    )

    medical_evidence: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
