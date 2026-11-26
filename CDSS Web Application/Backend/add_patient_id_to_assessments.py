from sqlalchemy import inspect, text

from app.database import engine


with engine.begin() as connection:
    inspector = inspect(connection)

    columns = {
        column["name"]
        for column in inspector.get_columns("patient_assessments")
    }

    if "patient_id" not in columns:
        connection.execute(
            text(
                """
                ALTER TABLE patient_assessments
                ADD COLUMN patient_id INTEGER
                REFERENCES patients(id)
                ON DELETE RESTRICT
                """
            )
        )
        print("patient_id column added successfully.")
    else:
        print("patient_id column already exists.")

    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS
            ix_patient_assessments_patient_id
            ON patient_assessments (patient_id)
            """
        )
    )

print("Patient assessment relationship is ready.")