
from app.database import Base, engine
from app.models.user import User
from app.models.session import UserSession

print("Creating CDSS database tables...")

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
