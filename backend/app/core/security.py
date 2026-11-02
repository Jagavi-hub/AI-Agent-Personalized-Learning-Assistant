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

import json
import urllib.request

def _verify_google_access_token(access_token: str, client_id: str) -> Optional[Dict[str, Any]]:
    """Verifies a Google OAuth2 access token with Google's official tokeninfo and userinfo services."""
    try:
        # 1. Verify token audience and expiration via Google tokeninfo
        info_req = urllib.request.Request(
            f"https://oauth2.googleapis.com/tokeninfo?access_token={access_token}",
            headers={"User-Agent": "LearnAI-Auth/1.0"}
        )
        with urllib.request.urlopen(info_req, timeout=5) as res:
            token_info = json.loads(res.read().decode())

        aud = token_info.get("aud") or token_info.get("issued_to") or token_info.get("azp")
        if aud != client_id:
            print(f"[Google Auth] Token audience mismatch: {aud} != {client_id}")
            return None

        exp = int(token_info.get("expires_in", 0))
        if exp <= 0:
            print("[Google Auth] Expired Google access token")
            return None

        # 2. Retrieve verified user identity via Google userinfo
        user_req = urllib.request.Request(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "LearnAI-Auth/1.0"
            }
        )
        with urllib.request.urlopen(user_req, timeout=5) as res:
            user_info = json.loads(res.read().decode())

        if not user_info.get("email_verified", True):
            print(f"[Google Auth] Rejected token with unverified email: {user_info.get('email')}")
            return None

        return user_info
    except Exception as err:
        print(f"[Google Auth] Access token verification error: {err}")
        return None

def verify_google_id_token(token_string: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google OAuth token (ID Token or Access Token) on the backend.
    Validates token signature, expiration, audience (Google Client ID),
    trusted Google issuer, and verified email.
    Returns the token payload if valid, or None if invalid or unconfigured.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id or not token_string:
        return None

    token_string = token_string.strip()

    # 1. Attempt verification as OpenID Connect ID Token (JWT)
    if token_string.count(".") == 2:
        try:
            id_info = id_token.verify_oauth2_token(
                token_string,
                google_requests.Request(),
                audience=client_id
            )

            # Enforce trusted Google issuer
            issuer = id_info.get("iss", "")
            if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
                print(f"[Google Auth] Rejected token with untrusted issuer: {issuer}")
                return None

            # Enforce verified email
            if not id_info.get("email_verified", True):
                print(f"[Google Auth] Rejected token with unverified email: {id_info.get('email')}")
                return None

            return id_info
        except Exception as e:
            print(f"[Google Auth] ID Token verification error: {e}")

    # 2. Attempt verification as OAuth2 Access Token
    return _verify_google_access_token(token_string, client_id)
