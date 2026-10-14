import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

# Load .env file from project root
dotenv_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

class Settings:
    PROJECT_NAME: str = "LearnAI - AI Agent-Based Personalized Learning Assistant"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # AI & LLM
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'learnai.db'}")
    
    # Uploads
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    # Authentication & Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "learnai-super-secret-jwt-key-higher-ed-2026-secure-token")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Google OAuth 2.0 / OpenID Connect
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

settings = Settings()

# Ensure uploads directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
