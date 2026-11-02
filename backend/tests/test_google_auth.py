import os
import sys
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.init_db import init_db
from app.core.config import settings
from app.core.security import verify_google_id_token
from app.models.entities import Student

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

# 1. Test Auth Config Endpoint
def test_auth_config_endpoint(client):
    res = client.get("/api/auth/config")
    assert res.status_code == 200
    data = res.json()
    assert "google_client_id" in data
    assert "google_enabled" in data
    assert "admin_allowlist_configured" in data
    assert data["admin_allowlist_configured"] is True

# 2. Test Google Auth Fails gracefully when token is invalid
def test_google_auth_invalid_token(client):
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock-google-client-id.apps.googleusercontent.com"):
        with patch("app.api.routes.verify_google_id_token", return_value=None):
            res = client.post("/api/auth/google", json={"credential": "invalid_token_xyz"})
            assert res.status_code == 400
            assert "invalid google authentication token" in res.json()["detail"].lower()

# 3. Test Google Auth Fails when Client ID is unconfigured
def test_google_auth_unconfigured_client_id(client):
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", ""):
        res = client.post("/api/auth/google", json={"credential": "some_token"})
        assert res.status_code == 400
        assert "not configured" in res.json()["detail"].lower()

# 4. Test Google Auth creates/signs in student with role="student"
def test_google_auth_student_role_resolution(client):
    mock_payload = {
        "sub": "google-uid-10001",
        "email": "test.google.student@university.edu",
        "name": "Google Student Test",
        "email_verified": True
    }
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com"):
        with patch("app.api.routes.verify_google_id_token", return_value=mock_payload):
            res = client.post("/api/auth/google", json={"credential": "valid_mock_token"})
            assert res.status_code == 200
            data = res.json()
            assert "access_token" in data
            assert data["student"]["email"] == "test.google.student@university.edu"
            assert data["student"]["is_admin"] is False
            assert data["student"]["role"] == "student"

            # Verify student token cannot access admin routes
            stu_client = TestClient(app)
            stu_client.headers = {"Authorization": f"Bearer {data['access_token']}"}
            admin_res = stu_client.get("/api/admin/dashboard/stats")
            assert admin_res.status_code == 403

# 5. Test Google Auth authenticating an approved admin email resolves role="admin"
def test_google_auth_admin_role_resolution(client):
    admin_email = "jagavi.raju@university.edu" # Configured in ADMIN_EMAILS
    mock_payload = {
        "sub": "google-admin-uid-9999",
        "email": admin_email,
        "name": "Jagavi Raju",
        "email_verified": True
    }
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com"):
        with patch("app.api.routes.verify_google_id_token", return_value=mock_payload):
            res = client.post("/api/auth/google", json={"credential": "valid_admin_token"})
            assert res.status_code == 200
            data = res.json()
            assert "access_token" in data
            assert data["student"]["email"] == admin_email
            assert data["student"]["is_admin"] is True
            assert data["student"]["role"] == "admin"

            # Verify admin token CAN access admin routes
            admin_test_client = TestClient(app)
            admin_test_client.headers = {"Authorization": f"Bearer {data['access_token']}"}
            admin_res = admin_test_client.get("/api/admin/dashboard/stats")
            assert admin_res.status_code == 200

# 6. Test id_token alias support in request body
def test_google_auth_id_token_alias(client):
    mock_payload = {
        "sub": "google-uid-10002",
        "email": "alias.student@university.edu",
        "name": "Alias Student",
        "email_verified": True
    }
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com"):
        with patch("app.api.routes.verify_google_id_token", return_value=mock_payload):
            # Passing "id_token" instead of "credential"
            res = client.post("/api/auth/google", json={"id_token": "valid_alias_token"})
            assert res.status_code == 200
            data = res.json()
            assert data["student"]["email"] == "alias.student@university.edu"

# 7. Test Suspended Account rejection on Google Sign-In
def test_google_auth_suspended_account_rejection(client):
    db = SessionLocal()
    suspended_email = "suspended.google.student@university.edu"
    existing = db.query(Student).filter(Student.email == suspended_email).first()
    if not existing:
        existing = Student(
            name="Suspended Google Student",
            email=suspended_email,
            status="suspended",
            role="student"
        )
        db.add(existing)
        db.commit()
    else:
        existing.status = "suspended"
        db.commit()
    db.close()

    mock_payload = {
        "sub": "google-suspended-uid",
        "email": suspended_email,
        "name": "Suspended Google Student",
        "email_verified": True
    }
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com"):
        with patch("app.api.routes.verify_google_id_token", return_value=mock_payload):
            res = client.post("/api/auth/google", json={"credential": "mock_suspended_token"})
            assert res.status_code == 403
            assert "suspended" in res.json()["detail"].lower()

# 8. Test Backend Token Verification Rejects Untrusted Issuer
def test_verify_google_id_token_untrusted_issuer():
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "valid-client-id"):
        with patch("google.oauth2.id_token.verify_oauth2_token", return_value={
            "iss": "https://malicious-issuer.com",
            "email": "user@example.com",
            "email_verified": True
        }):
            result = verify_google_id_token("mock_token")
            assert result is None

# 9. Test Backend Token Verification Rejects Unverified Email
def test_verify_google_id_token_unverified_email():
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "valid-client-id"):
        with patch("google.oauth2.id_token.verify_oauth2_token", return_value={
            "iss": "accounts.google.com",
            "email": "unverified@example.com",
            "email_verified": False
        }):
            result = verify_google_id_token("mock_token")
            assert result is None

# 10. Test Dedicated Admin Google Auth Endpoint: Authorized Admin Succeeds
def test_google_auth_admin_authorized_success(client):
    admin_email = "admin@learnai.edu" # Configured in ADMIN_EMAILS
    mock_payload = {
        "sub": "google-admin-uid-8888",
        "email": admin_email,
        "name": "Platform Administrator",
        "email_verified": True
    }
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com"):
        with patch("app.api.routes.verify_google_id_token", return_value=mock_payload):
            res = client.post("/api/auth/admin/google", json={"credential": "valid_admin_token"})
            assert res.status_code == 200
            data = res.json()
            assert "access_token" in data
            assert data["student"]["email"] == admin_email
            assert data["student"]["is_admin"] is True
            assert data["student"]["role"] == "admin"

            # Access admin dashboard with issued token
            admin_client = TestClient(app)
            admin_client.headers = {"Authorization": f"Bearer {data['access_token']}"}
            dash_res = admin_client.get("/api/admin/dashboard/stats")
            assert dash_res.status_code == 200

# 11. Test Dedicated Admin Google Auth Endpoint: Unauthorized Google Account is Denied (403)
def test_google_auth_admin_unauthorized_denied(client):
    unauthorized_email = "unauthorized.student@gmail.com" # NOT in ADMIN_EMAILS
    mock_payload = {
        "sub": "google-unauthorized-uid-7777",
        "email": unauthorized_email,
        "name": "Unauthorized User",
        "email_verified": True
    }
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com"):
        with patch("app.api.routes.verify_google_id_token", return_value=mock_payload):
            res = client.post("/api/auth/admin/google", json={"credential": "mock_unauthorized_token"})
            assert res.status_code == 403
            err = res.json()["detail"]
            assert "forbidden" in err.lower()
            assert "not authorized for administrator access" in err.lower()

            # Verify that unauthorized user was NOT made an admin in DB
            db = SessionLocal()
            user_in_db = db.query(Student).filter(Student.email == unauthorized_email).first()
            if user_in_db:
                assert user_in_db.is_admin is False
                assert user_in_db.role != "admin"
            db.close()
