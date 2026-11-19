
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "patient_reference",
            name="uq_patient_doctor_reference",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
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
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    date_of_birth: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    sex: Mapped[str | None] = mapped_column(
        String(1),
        nullable=True,
    )

    medical_history: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    family_history: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    medications: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    allergies: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
