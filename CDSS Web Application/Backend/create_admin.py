
import getpass

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models.user import User
from app.services.security import hash_password


def create_admin():
    print("\n=== Heart Disease CDSS Administrator Setup ===\n")

    full_name = input("Administrator full name: ").strip()
    email = input("Administrator email: ").strip().lower()

    if not full_name:
        print("Error: Full name is required.")
        return

    if not email or "@" not in email:
        print("Error: Enter a valid email address.")
        return

    password = getpass.getpass("Create administrator password: ")
    confirm_password = getpass.getpass("Confirm password: ")

    if len(password) < 12:
        print("Error: Password must contain at least 12 characters.")
        return

    if password != confirm_password:
        print("Error: Passwords do not match.")
        return

    with SessionLocal() as db:
        admin_count = db.scalar(
            select(func.count(User.id)).where(
                User.role == "admin"
            )
        )

        if admin_count > 0:
            print(
                "An administrator already exists. "
                "Additional accounts must be created "
                "through the admin management workflow."
            )
            return

        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user:
            print("Error: An account with this email already exists.")
            return

        admin = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("\nAdministrator account created successfully!")
        print(f"Email: {email}")
        print("Role: admin")


if __name__ == "__main__":
    create_admin()
