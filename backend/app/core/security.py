import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings

ph = PasswordHasher()

def hash_password(password: str) -> str:
    """Hashes a password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2 hash."""
    if not hashed_password:
        return False
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def generate_reset_token() -> str:
    """Generates a cryptographically secure random reset token."""
    return secrets.token_urlsafe(32)

def verify_google_id_token(token_string: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google OAuth / OpenID Connect ID token on the backend.
    Returns the token payload if valid, or None if invalid or unconfigured.
    """
    if not settings.GOOGLE_CLIENT_ID:
        # Development note: Google Client ID must be configured in .env for live verification
        return None
    try:
        id_info = id_token.verify_oauth2_token(
            token_string,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        return id_info
    except Exception as e:
        print(f"[Google Auth] Token verification error: {e}")
        return None
