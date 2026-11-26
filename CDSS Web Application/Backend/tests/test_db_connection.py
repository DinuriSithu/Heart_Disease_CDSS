
from sqlalchemy import text

from app.database import engine

try:
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        database_user = connection.execute(
            text("SELECT current_user")
        ).scalar_one()

        print("PostgreSQL connection successful!")
        print(f"Database: {database_name}")
        print(f"Connected user: {database_user}")

except Exception as error:
    print("PostgreSQL connection failed!")
    print(f"Error: {error}")
    raise
