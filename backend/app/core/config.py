import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

# Load .env file from project root or backend
if (BASE_DIR / ".env").exists():
    load_dotenv(dotenv_path=BASE_DIR / ".env")
if (BASE_DIR / "backend" / ".env").exists():
    load_dotenv(dotenv_path=BASE_DIR / "backend" / ".env", override=False)

def _normalize_database_url(url: str, base_dir: Path) -> str:
    """Ensures relative SQLite database paths resolve to the canonical project root."""
    if not url:
        return f"sqlite:///{(base_dir / 'learnai.db').resolve().as_posix()}"
    if url.startswith("sqlite:///./"):
        rel = url[len("sqlite:///./"):]
        return f"sqlite:///{(base_dir / rel).resolve().as_posix()}"
    if url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
        path_part = url[len("sqlite:///"):]
        if not (len(path_part) >= 2 and path_part[1] == ":"):
            p = Path(path_part)
            if not p.is_absolute():
                return f"sqlite:///{(base_dir / p).resolve().as_posix()}"
    return url

class Settings:
    BASE_DIR: Path = BASE_DIR
    PROJECT_NAME: str = "LearnAI - AI Agent-Based Personalized Learning Assistant"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # AI & LLM
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    # Database
    @property
    def DATABASE_URL(self) -> str:
        raw = os.getenv("DATABASE_URL", f"sqlite:///{self.BASE_DIR / 'learnai.db'}")
        return _normalize_database_url(raw, self.BASE_DIR)
    
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
    GOOGLE_CLIENT_ID: str = (os.getenv("GOOGLE_CLIENT_ID") or os.getenv("VITE_GOOGLE_CLIENT_ID") or "").strip()
    
    # Admin Authorization & Security
    ADMIN_EMAILS_RAW: str = "jagavi.raju@university.edu,admin@learnai.edu,jagavir.ad24@bitsathy.ac.in,diyas.ad24@bitsathy.ac.in,hemalathaa.ad24@bitsathy.ac.in"

    @property
    def ADMIN_EMAILS(self) -> list[str]:
        raw = os.getenv("ADMIN_EMAILS", self.ADMIN_EMAILS_RAW)
        # Strip any accidental redundant prefix e.g. "ADMIN_EMAILS=ADMIN_EMAILS="
        while "admin_emails=" in raw.lower():
            idx = raw.lower().find("admin_emails=")
            raw = raw[:idx] + raw[idx + len("admin_emails="):]
        emails = [e.strip().lower() for e in raw.split(",") if e.strip()]
        # Always merge built-in default admin emails
        for default_admin in self.ADMIN_EMAILS_RAW.split(","):
            d = default_admin.strip().lower()
            if d and d not in emails:
                emails.append(d)
        return emails

    def is_admin_email(self, email: Optional[str]) -> bool:
        if not email:
            return False
        return email.strip().lower() in self.ADMIN_EMAILS

    # Storage Quotas & Retention Policy (Bytes)
    DEFAULT_STORAGE_QUOTA_BYTES: int = int(os.getenv("DEFAULT_STORAGE_QUOTA_BYTES", str(50 * 1024 * 1024)))  # 50 MB
    MAX_STORAGE_QUOTA_BYTES: int = int(os.getenv("MAX_STORAGE_QUOTA_BYTES", str(5 * 1024 * 1024 * 1024)))   # 5 GB safety limit
    STORAGE_WARNING_THRESHOLD: float = float(os.getenv("STORAGE_WARNING_THRESHOLD", "0.80"))                 # 80%
    CLEANUP_GRACE_PERIOD_DAYS: int = int(os.getenv("CLEANUP_GRACE_PERIOD_DAYS", "30"))                       # 30-day retention grace period

settings = Settings()

# Ensure uploads directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
