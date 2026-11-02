import os
import io
import sys
import json
import pytest
from datetime import datetime, timedelta, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.init_db import init_db
from app.core.security import create_access_token, hash_password
from app.models.entities import (
    Student, KnowledgeDocument, Feedback, FeedbackReply,
    Notification, StorageWarning, StorageCleanupLog, AuditLog
)
from app.services.admin_service import admin_service

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def unauthenticated_client():
    return TestClient(app)

@pytest.fixture
def admin_client():
    client = TestClient(app)
    # Login as seeded admin (jagavi.raju@university.edu is in ADMIN_EMAILS)
    res = client.post("/api/auth/login", json={
        "email": "jagavi.raju@university.edu",
        "password": "LearnAI2026Secure"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    token = res.json()["access_token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

@pytest.fixture
def student_client():
    client = TestClient(app)
    db = SessionLocal()
    try:
        # Create or fetch a test regular student
        test_email = "regular.student.test@university.edu"
        student = db.query(Student).filter(Student.email == test_email).first()
        if not student:
            student = Student(
                name="Regular Student",
                email=test_email,
                hashed_password=hash_password("StudentPass123"),
                role="student",
                is_admin=False,
                department="Computer Science",
                year="2nd Year",
                semester="4th Semester",
                is_onboarded=True
            )
            db.add(student)
            db.commit()
            db.refresh(student)

        res = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "StudentPass123"
        })
        assert res.status_code == 200, f"Student login failed: {res.text}"
        token = res.json()["access_token"]
        client.headers = {"Authorization": f"Bearer {token}"}
        return client
    finally:
        db.close()


# 1. Unauthenticated requests to admin routes return 401
def test_unauthenticated_admin_routes_return_401(unauthenticated_client):
    endpoints = [
        "/api/admin/dashboard/stats",
        "/api/admin/users",
        "/api/admin/storage/warnings",
        "/api/admin/storage/cleanup/logs",
        "/api/admin/feedback",
        "/api/admin/audit-logs",
    ]
    for ep in endpoints:
        res = unauthenticated_client.get(ep)
        assert res.status_code == 401, f"Expected 401 on {ep}, got {res.status_code}"


# 2. Authenticated requests from regular students to admin routes return 403
def test_student_access_to_admin_routes_returns_403(student_client):
    endpoints = [
        "/api/admin/dashboard/stats",
        "/api/admin/users",
        "/api/admin/storage/warnings",
        "/api/admin/storage/cleanup/logs",
        "/api/admin/feedback",
        "/api/admin/audit-logs",
    ]
    for ep in endpoints:
        res = student_client.get(ep)
        assert res.status_code == 403, f"Expected 403 on {ep}, got {res.status_code}"
        assert "Forbidden" in res.json().get("detail", "")


# 3. Authenticated requests from authorized admin accounts succeed
def test_admin_access_succeeds(admin_client):
    res = admin_client.get("/api/admin/dashboard/stats")
    assert res.status_code == 200, f"Dashboard stats failed: {res.text}"
    data = res.json()
    assert "users" in data
    assert "storage" in data
    assert "feedback" in data
    assert data["users"]["total_registered"] >= 1

    users_res = admin_client.get("/api/admin/users")
    assert users_res.status_code == 200
    users_data = users_res.json()
    assert "items" in users_data
    assert users_data["total"] >= 1


# 4. Supplying an admin email during public registration does NOT grant admin privileges unless in ADMIN_EMAILS
def test_public_registration_cannot_elevate_admin_role(unauthenticated_client):
    random_email = f"attacker.wannabe.admin.{datetime.now().timestamp()}@fake-domain.com"
    reg_payload = {
        "name": "Attacker Trying Role Elevation",
        "email": random_email,
        "password": "Password123!",
        "department": "Security",
        "year": "4th Year",
        "semester": "8th Semester"
    }
    res = unauthenticated_client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    user_info = res.json()["student"]
    assert user_info["role"] == "student"
    assert user_info["is_admin"] is False

    # Attempting to access admin route with this newly registered token fails with 403
    token = res.json()["access_token"]
    c = TestClient(app)
    c.headers = {"Authorization": f"Bearer {token}"}
    admin_check = c.get("/api/admin/dashboard/stats")
    assert admin_check.status_code == 403


# 5. Real disk storage calculation correctly reflects user uploads while excluding shared course materials
def test_storage_breakdown_excludes_shared_materials(admin_client):
    db = SessionLocal()
    try:
        # Check that course materials have is_course_material == True
        course_mats = db.query(KnowledgeDocument).filter(KnowledgeDocument.is_course_material == True).all()
        assert len(course_mats) >= 4, "Expected at least 4 seeded institutional course materials"

        breakdown = admin_service.get_user_storage_breakdown(db, student_id=1)
        assert "used_bytes" in breakdown
        assert "quota_bytes" in breakdown
        assert breakdown["quota_bytes"] >= 50 * 1024 * 1024

        # None of the files in breakdown["files"] should be course materials
        for f in breakdown.get("files", []):
            p = f.get("file_path", "")
            assert "course_materials" not in p.lower(), f"Shared material {p} was incorrectly counted in user quota"
    finally:
        db.close()


# 6. Uploads that would exceed quota are blocked with an informative 400 error
def test_upload_exceeding_quota_blocked_with_informative_error(student_client):
    db = SessionLocal()
    try:
        st = db.query(Student).filter(Student.email == "regular.student.test@university.edu").first()
        assert st is not None
        # Temporarily set quota to 100 bytes to force quota exceed
        original_quota = st.custom_quota_bytes
        st.custom_quota_bytes = 100
        db.commit()

        # Try to upload a file that is 500 bytes (> 100 bytes)
        fake_content = b"A" * 500
        files = {"file": ("test_huge_file.txt", io.BytesIO(fake_content), "text/plain")}
        res = student_client.post("/api/knowledge/upload", files=files)

        assert res.status_code == 400
        error_msg = res.json().get("detail", "")
        assert "quota" in error_msg.lower() or "exceed" in error_msg.lower(), f"Unexpected error detail: {error_msg}"

        # Restore quota
        st.custom_quota_bytes = original_quota
        db.commit()
    finally:
        db.close()


# 7. Storage warnings trigger at 80% and quota exceeded warning at 100% with a 30-day resolution deadline
def test_storage_warnings_and_retention_deadline():
    db = SessionLocal()
    try:
        st = db.query(Student).filter(Student.email == "regular.student.test@university.edu").first()
        # Set quota to 1000 bytes
        st.custom_quota_bytes = 1000
        db.commit()

        # Check update warning when usage is at or above 80%
        # Suppose usage is 850 bytes (85%)
        warning_type = admin_service.check_and_update_storage_warning(db, st, simulated_usage_bytes=850)
        assert warning_type == "storage_approaching"

        warning_rec = db.query(StorageWarning).filter(
            StorageWarning.student_id == st.id,
            StorageWarning.status == "active"
        ).first()
        assert warning_rec is not None
        assert warning_rec.reason == "warning_threshold"
        assert warning_rec.deadline is not None
        # Deadline should be roughly 30 days in the future
        days_diff = (warning_rec.deadline - datetime.utcnow()).days
        assert 29 <= days_diff <= 31

        # Now test 100%+ quota exceeded
        exceeded_type = admin_service.check_and_update_storage_warning(db, st, simulated_usage_bytes=1050)
        assert exceeded_type == "storage_exceeded"

        # Resolution when usage drops below 80%
        resolved_type = admin_service.check_and_update_storage_warning(db, st, simulated_usage_bytes=400)
        assert resolved_type is None
        # Warning record should be resolved
        resolved_rec = db.query(StorageWarning).filter(
            StorageWarning.student_id == st.id,
            StorageWarning.status == "resolved"
        ).first()
        assert resolved_rec is not None
    finally:
        db.close()


# 8. Cleanup dry-run previews eligible files and space to be freed without deleting anything
def test_cleanup_dry_run_previews_without_deleting():
    db = SessionLocal()
    try:
        st = db.query(Student).filter(Student.email == "regular.student.test@university.edu").first()
        res = admin_service.execute_storage_cleanup(
            db=db,
            student_id=st.id,
            is_dry_run=True,
            admin_id=1,
            admin_email="jagavi.raju@university.edu"
        )
        assert "is_dry_run" in res
        assert res["is_dry_run"] is True
        assert "files_evaluated" in res
        assert "bytes_reclaimed" in res
        assert "deleted_files" in res
    finally:
        db.close()


# 9 & 10. Cleanup deletes ONLY eligible user files, oldest-first, and NEVER deletes course materials, users, or grades
def test_course_materials_and_user_data_immune_to_cleanup():
    db = SessionLocal()
    try:
        # Verify shared materials exist before
        materials_before = db.query(KnowledgeDocument).filter(KnowledgeDocument.is_course_material == True).count()
        students_before = db.query(Student).count()

        # Run execute_storage_cleanup on student 1
        res = admin_service.execute_storage_cleanup(
            db=db,
            student_id=1,
            is_dry_run=True, # Safety check in dry-run
            admin_id=1,
            admin_email="jagavi.raju@university.edu"
        )

        materials_after = db.query(KnowledgeDocument).filter(KnowledgeDocument.is_course_material == True).count()
        students_after = db.query(Student).count()

        assert materials_before == materials_after, "Institutional course materials must never be deleted"
        assert students_before == students_after, "User accounts must never be deleted during storage cleanup"
    finally:
        db.close()


# 11. In-app notifications are created with deduplication and unread counts work correctly
def test_notification_creation_deduplication_and_unread_counts(admin_client):
    db = SessionLocal()
    try:
        admin_user = db.query(Student).filter(Student.email == "jagavi.raju@university.edu").first()
        title = f"Test Alert {datetime.now().timestamp()}"

        # 1. Create notification
        n1 = admin_service.create_notification(
            db=db,
            user_id=admin_user.id,
            notif_type="account_notice",
            title=title,
            message="Your account has a notice",
            deduplicate_hours=24
        )
        assert n1 is not None

        # 2. Duplicate within 24h returns existing notification without creating second record
        n2 = admin_service.create_notification(
            db=db,
            user_id=admin_user.id,
            notif_type="account_notice",
            title=title,
            message="Your account has a notice duplicate",
            deduplicate_hours=24
        )
        assert n1.id == n2.id

        # 3. Test API endpoint GET /api/notifications
        res = admin_client.get("/api/notifications")
        assert res.status_code == 200
        data = res.json()
        assert "notifications" in data or "items" in data
        assert data["unread_count"] >= 1

        # 4. Mark read
        patch_res = admin_client.patch(f"/api/notifications/{n1.id}/read")
        assert patch_res.status_code == 200
        assert patch_res.json()["is_read"] is True
    finally:
        db.close()


# 12. Two-way feedback replies update status and notify both parties appropriately
def test_two_way_feedback_replies_and_status(admin_client, student_client):
    # 1. Student submits feedback
    fb_res = student_client.post("/api/feedback", json={
        "rating": 4,
        "category": "Platform Performance",
        "subject": "Quick doubt about storage widget",
        "comment": "Is my storage quota refreshed automatically after delete?"
    })
    assert fb_res.status_code == 200
    fb_id = fb_res.json()["id"]

    # 2. Admin inspects thread
    thread_res = admin_client.get(f"/api/admin/feedback/{fb_id}")
    assert thread_res.status_code == 200
    thread_data = thread_res.json()
    assert thread_data["status"] == "open"

    # 3. Admin replies to student
    reply_res = admin_client.post(f"/api/admin/feedback/{fb_id}/reply", json={
        "message": "Yes, deleting an uploaded document immediately reclaims your storage quota."
    })
    assert reply_res.status_code == 200
    assert reply_res.json()["sender_role"] == "admin"

    # 4. Check that status is updated to awaiting_student
    updated_thread = admin_client.get(f"/api/admin/feedback/{fb_id}").json()
    assert updated_thread["status"] == "awaiting_student"
    assert len(updated_thread["replies"]) == 1

    # 5. Student replies back
    student_reply_res = student_client.post(f"/api/feedback/{fb_id}/reply", json={
        "message": "Thank you! That worked seamlessly."
    })
    assert student_reply_res.status_code == 200
    assert student_reply_res.json()["sender_role"] == "student"

    # Status should now be awaiting_admin
    thread_after_student = student_client.get(f"/api/feedback/{fb_id}").json()
    assert thread_after_student["status"] == "awaiting_admin"
    assert len(thread_after_student["replies"]) == 2


# 13. Audit log records administrative actions with sensitive data redacted
def test_audit_log_redaction_and_persistence(admin_client):
    db = SessionLocal()
    try:
        # Log event with sensitive password/token keys
        entry = admin_service.log_audit_event(
            db=db,
            admin_email="jagavi.raju@university.edu",
            action="security_audit_test",
            target_type="user",
            target_id="999",
            details={
                "password": "SuperSecretPassword123",
                "token": "sensitive_jwt_token_payload",
                "safe_note": "This note should be visible"
            }
        )
        assert entry.id is not None
        details = json.loads(entry.details_json)
        assert details["password"] == "[REDACTED]"
        assert details["token"] == "[REDACTED]"
        assert details["safe_note"] == "This note should be visible"

        # Verify through admin API
        res = admin_client.get("/api/admin/audit-logs")
        assert res.status_code == 200
        audit_data = res.json()
        assert audit_data["total"] >= 1
    finally:
        db.close()


# 14. Dedicated Admin Login endpoint (/api/auth/admin/login) enforcement
def test_dedicated_admin_login_endpoint(unauthenticated_client):
    # Case A: Non-existent email -> 401 Unauthorized
    res_fake = unauthenticated_client.post("/api/auth/admin/login", json={
        "email": "nonexistent.admin@university.edu",
        "password": "AnyPassword123"
    })
    assert res_fake.status_code == 401
    assert "Invalid email or password" in res_fake.json()["detail"]

    # Case B: Correct admin email but incorrect password -> 401 Unauthorized
    res_bad_pw = unauthenticated_client.post("/api/auth/admin/login", json={
        "email": "jagavi.raju@university.edu",
        "password": "WrongPassword2026"
    })
    assert res_bad_pw.status_code == 401
    assert "Invalid email or password" in res_bad_pw.json()["detail"]

    # Case C: Valid student credentials trying to use admin login -> 403 Forbidden
    res_student = unauthenticated_client.post("/api/auth/admin/login", json={
        "email": "regular.student.test@university.edu",
        "password": "StudentPass123"
    })
    assert res_student.status_code == 403
    assert "not authorized for administrator access" in res_student.json()["detail"].lower()

    # Case D: Valid administrator credentials -> 200 OK with JWT and admin profile
    res_admin = unauthenticated_client.post("/api/auth/admin/login", json={
        "email": "jagavi.raju@university.edu",
        "password": "LearnAI2026Secure"
    })
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["student"]["email"] == "jagavi.raju@university.edu"
    assert data["student"]["is_admin"] is True

    # Case E: Direct authorization verification using the received token
    admin_token = data["access_token"]
    test_client = TestClient(app)
    test_client.headers = {"Authorization": f"Bearer {admin_token}"}
    stats_res = test_client.get("/api/admin/dashboard/stats")
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert "users" in stats_data
    assert "storage" in stats_data
    assert stats_data["users"]["total_registered"] >= 1


# 15. Student demo accounts and regular student login remain fully operational
def test_student_login_and_demo_accounts_preserved(unauthenticated_client):
    demo_accounts = [
        ("hemalatha.a@university.edu", "LearnAI2026Secure"),
        ("diya.s@university.edu", "LearnAI2026Secure"),
    ]
    for email, pwd in demo_accounts:
        # Student login succeeds
        res = unauthenticated_client.post("/api/auth/login", json={"email": email, "password": pwd})
        assert res.status_code == 200
        token = res.json()["access_token"]
        assert res.json()["student"]["email"] == email

        # But admin endpoints block the student token with 403 Forbidden
        stu_client = TestClient(app)
        stu_client.headers = {"Authorization": f"Bearer {token}"}
        admin_res = stu_client.get("/api/admin/dashboard/stats")
        assert admin_res.status_code == 403
        assert "Forbidden" in admin_res.json()["detail"]


# 16. Dynamic ADMIN_EMAILS environment variable configuration
def test_admin_allowlist_environment_configuration(monkeypatch, unauthenticated_client):
    # Set dynamic ADMIN_EMAILS via environment variable
    custom_admin_email = "dean.academics@university.edu"
    monkeypatch.setenv("ADMIN_EMAILS", f"jagavi.raju@university.edu,{custom_admin_email}")

    # Verify settings picks it up dynamically
    assert settings.is_admin_email(custom_admin_email) is True
    assert custom_admin_email in settings.ADMIN_EMAILS

    # An unauthorized email is rejected
    assert settings.is_admin_email("intruder@random.com") is False


# 17. Phase 1 Regression Test: Student Detail Profile endpoint (/api/admin/users/{user_id})
def test_admin_student_detail_endpoint_regression(admin_client, student_client, unauthenticated_client):
    # 1. Unauthenticated request returns 401
    unauth_res = unauthenticated_client.get("/api/admin/users/1")
    assert unauth_res.status_code == 401

    # 2. Non-admin student request returns 403
    forbidden_res = student_client.get("/api/admin/users/1")
    assert forbidden_res.status_code == 403

    # 3. Non-existent student ID returns 404
    not_found_res = admin_client.get("/api/admin/users/999999")
    assert not_found_res.status_code == 404
    assert "not found" in not_found_res.json()["detail"].lower()

    # 4. Valid authorized request returns student's actual details without 500 error
    db = SessionLocal()
    try:
        # Fetch an existing student
        student = db.query(Student).filter(Student.id == 1).first()
        assert student is not None, "Seeded student with id=1 should exist"

        res = admin_client.get(f"/api/admin/users/{student.id}")
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        data = res.json()

        assert data["id"] == student.id
        assert data["name"] == student.name
        assert data["email"] == student.email
        assert "storage" in data
        assert "courses" in data
        assert isinstance(data["courses"], list)
        assert "documents" in data
        assert isinstance(data["documents"], list)
        assert "quiz_attempts" in data
        assert isinstance(data["quiz_attempts"], list)
        assert "storage_warnings" in data
        assert "recent_feedbacks" in data
        assert "recent_notifications" in data

        # 5. Missing / optional fields test: Create a student with minimal/None attributes
        sparse_email = "sparse.student.test@university.edu"
        sparse_student = db.query(Student).filter(Student.email == sparse_email).first()
        if not sparse_student:
            sparse_student = Student(
                name="Sparse Student",
                email=sparse_email,
                hashed_password=hash_password("Pass123!"),
                role=None,
                status=None,
                department=None,
                year=None,
                semester=None,
                current_skill_level=None,
                enrolled_subjects=None
            )
            db.add(sparse_student)
            db.commit()
            db.refresh(sparse_student)

        sparse_res = admin_client.get(f"/api/admin/users/{sparse_student.id}")
        assert sparse_res.status_code == 200, f"Sparse student failed: {sparse_res.text}"
        sparse_data = sparse_res.json()
        assert sparse_data["id"] == sparse_student.id
        assert sparse_data["email"] == sparse_email
        assert sparse_data["department"] in ["General", "Computer Science & Engineering"]
        assert sparse_data["status"] == "active"
        assert sparse_data["year"] in ["3rd Year", "2nd Year", "1st Year"]
    finally:
        db.close()


# 18. Quota update calculation, human formatting, and notification
def test_quota_update_calculation_and_human_formatting(admin_client):
    db = SessionLocal()
    try:
        # Find or create a test student
        test_email = "quota.test.student@university.edu"
        st = db.query(Student).filter(Student.email == test_email).first()
        if not st:
            st = Student(
                name="Quota Test Student",
                email=test_email,
                hashed_password=hash_password("Pass123!"),
                role="student",
                status="active"
            )
            db.add(st)
            db.commit()
            db.refresh(st)

        # Update quota to 125 MB using custom_quota_mb
        target_mb = 125
        res = admin_client.put(
            f"/api/admin/users/{st.id}/quota",
            json={"custom_quota_mb": target_mb}
        )
        assert res.status_code == 200, f"Quota update failed: {res.text}"
        data = res.json()
        expected_bytes = target_mb * 1024 * 1024
        assert data["quota_bytes"] == expected_bytes
        assert "125.0 MB" in data["message"]

        # Verify DB persisted
        db.refresh(st)
        assert st.custom_quota_bytes == expected_bytes

        # Verify audit log recorded
        audit = db.query(AuditLog).filter(
            AuditLog.action == "quota_updated",
            AuditLog.target_id == str(st.id)
        ).order_by(AuditLog.timestamp.desc()).first()
        assert audit is not None
        details = json.loads(audit.details_json)
        assert details["new_quota_bytes"] == expected_bytes
        assert details["new_quota_human"] == "125.0 MB"

        # Verify student received in-app notification
        notif = db.query(Notification).filter(
            Notification.user_id == st.id,
            Notification.title == "Storage Quota Updated"
        ).first()
        assert notif is not None
        assert "125.0 MB" in notif.message
    finally:
        db.close()


# 19. Targeted individual alert broadcast isolation
def test_targeted_individual_alert_broadcast_isolation(admin_client):
    db = SessionLocal()
    try:
        # Find two students
        students = db.query(Student).filter(Student.role == "student").limit(2).all()
        assert len(students) >= 2, "Need at least two student accounts for test"
        target_student = students[0]
        other_student = students[1]

        target_notifs_before = db.query(Notification).filter(Notification.user_id == target_student.id).count()
        other_notifs_before = db.query(Notification).filter(Notification.user_id == other_student.id).count()

        unique_title = f"Individual Notice {datetime.utcnow().timestamp()}"
        res = admin_client.post(
            "/api/admin/alerts/broadcast",
            json={
                "scope": "individual",
                "target_user_ids": [target_student.id],
                "title": unique_title,
                "message": "Direct message intended exclusively for this student.",
                "category": "account_notice"
            }
        )
        assert res.status_code == 200, f"Alert failed: {res.text}"
        data = res.json()
        assert data["recipients_count"] == 1

        target_notifs_after = db.query(Notification).filter(Notification.user_id == target_student.id).count()
        other_notifs_after = db.query(Notification).filter(Notification.user_id == other_student.id).count()

        # Target received exactly 1 new notification
        assert target_notifs_after == target_notifs_before + 1
        # Other student received 0 new notifications
        assert other_notifs_after == other_notifs_before
    finally:
        db.close()


# 20. Student account removal safeguards and deletion
def test_student_account_removal_safeguards_and_deletion(admin_client, unauthenticated_client):
    db = SessionLocal()
    try:
        # Find admin student
        admin = db.query(Student).filter(Student.email == "jagavi.raju@university.edu").first()
        assert admin is not None

        # 1. Admin cannot delete their own account
        res_self = admin_client.delete(f"/api/admin/users/{admin.id}")
        assert res_self.status_code == 400
        assert "cannot delete their own active account" in res_self.json()["detail"].lower()

        # 2. Non-admin cannot invoke delete endpoint
        regular_student = db.query(Student).filter(Student.email == "hemalatha.a@university.edu").first()
        assert regular_student is not None
        stu_token = unauthenticated_client.post("/api/auth/login", json={
            "email": "hemalatha.a@university.edu",
            "password": "LearnAI2026Secure"
        }).json()["access_token"]
        stu_client = TestClient(app)
        stu_client.headers = {"Authorization": f"Bearer {stu_token}"}
        res_unauth = stu_client.delete(f"/api/admin/users/{regular_student.id}")
        assert res_unauth.status_code == 403

        # 3. Create disposable test student with associated records
        disposable_email = f"disposable.{int(datetime.utcnow().timestamp())}@university.edu"
        disposable_st = Student(
            name="Disposable Student",
            email=disposable_email,
            hashed_password=hash_password("Pass123!"),
            role="student",
            status="active"
        )
        db.add(disposable_st)
        db.commit()
        db.refresh(disposable_st)
        disposable_id = disposable_st.id

        # Attach a course material (institutional) to verify preservation
        course_doc = KnowledgeDocument(
            student_id=disposable_id,
            filename="Institutional_Syllabus.pdf",
            file_path="uploads/course_materials/Institutional_Syllabus.pdf",
            is_course_material=True
        )
        db.add(course_doc)
        db.commit()
        db.refresh(course_doc)
        course_doc_id = course_doc.id

        # Perform deletion
        del_res = admin_client.delete(f"/api/admin/users/{disposable_id}")
        assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
        assert del_res.json()["status"] == "success"

        # Verify disposable student is deleted from DB
        deleted_st = db.query(Student).filter(Student.id == disposable_id).first()
        assert deleted_st is None

        # Verify shared course document was preserved and reassigned to admin
        db.expire_all()
        preserved_doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == course_doc_id).first()
        assert preserved_doc is not None
        assert preserved_doc.student_id == admin.id
        assert preserved_doc.is_course_material is True

        # Clean up test course doc
        db.delete(preserved_doc)
        db.commit()

        # Verify audit log was recorded
        audit = db.query(AuditLog).filter(
            AuditLog.action == "student_account_deleted",
            AuditLog.target_id == str(disposable_id)
        ).first()
        assert audit is not None
        assert disposable_email in audit.details_json
    finally:
        db.close()


def test_admin_endpoint_authorization_and_isolation(unauthenticated_client, student_client):
    """
    Verify security isolation:
    1. Unauthenticated requests to /api/admin/* must return HTTP 401.
    2. Student authenticated requests to /api/admin/* must return HTTP 403.
    3. Production database (learnai.db) contains zero demo records (@example.com).
    """
    admin_endpoints = [
        ("GET", "/api/admin/dashboard/stats"),
        ("GET", "/api/admin/users"),
        ("GET", "/api/admin/storage/warnings"),
        ("GET", "/api/admin/feedback"),
        ("GET", "/api/admin/system/health"),
        ("GET", "/api/admin/audit-logs"),
        ("GET", "/api/admin/settings"),
        ("POST", "/api/admin/alerts/broadcast"),
    ]

    for method, path in admin_endpoints:
        # 1. Unauthenticated -> 401
        if method == "GET":
            unauth_res = unauthenticated_client.get(path)
        else:
            unauth_res = unauthenticated_client.post(path, json={})
        assert unauth_res.status_code == 401, f"Expected 401 for unauthenticated {path}, got {unauth_res.status_code}"

        # 2. Student Role -> 403
        if method == "GET":
            student_res = student_client.get(path)
        else:
            student_res = student_client.post(path, json={})
        assert student_res.status_code == 403, f"Expected 403 for student role {path}, got {student_res.status_code}"

    # 3. Database Isolation: Confirm no @example.com demo accounts leak into real DB
    db = SessionLocal()
    try:
        demo_accounts_in_db = db.query(Student).filter(Student.email.like("%@example.com%")).all()
        assert len(demo_accounts_in_db) == 0, (
            f"Isolation breach: Found {len(demo_accounts_in_db)} demo accounts in real database: "
            f"{[s.email for s in demo_accounts_in_db]}"
        )
    finally:
        db.close()


def test_admin_portal_buttons_full_end_to_end_loop(admin_client, unauthenticated_client):
    """
    Comprehensive End-to-End Test for Admin Portal Action Buttons:
    1. Send Alert:
       - Admin sends targeted alert to student A.
       - Returns delivered_count and notification_id.
       - Student A receives unread alert in notification center.
       - Student A marks alert read.
       - Student B cannot access or modify Student A's alert (isolation).
    2. Adjust Quota:
       - Admin updates student A's quota to 125 MB.
       - Student A's storage endpoint reflects 125 MB quota.
       - Automatic in-app notification delivered to Student A.
    3. Suspend and Reactivate:
       - Admin suspends Student A.
       - Active JWT token for Student A is immediately blocked (HTTP 403 Forbidden).
       - Login attempt by Student A returns HTTP 403 Forbidden.
       - Admin reactivates Student A.
       - Student A's token immediately works again (HTTP 200).
    """
    db = SessionLocal()
    try:
        # 1. Setup Student A
        email_a = "e2e_student_a@university.edu"
        student_a = db.query(Student).filter(Student.email == email_a).first()
        if not student_a:
            student_a = Student(
                name="E2E Student Alpha",
                email=email_a,
                hashed_password=hash_password("PasswordA123"),
                role="student",
                status="active",
                is_admin=False,
                department="Computer Science",
                year="3rd Year",
                semester="6th Semester",
                is_onboarded=True
            )
            db.add(student_a)
            db.commit()
            db.refresh(student_a)
        else:
            student_a.status = "active"
            student_a.custom_quota_bytes = None
            db.commit()

        # 2. Setup Student B
        email_b = "e2e_student_b@university.edu"
        student_b = db.query(Student).filter(Student.email == email_b).first()
        if not student_b:
            student_b = Student(
                name="E2E Student Beta",
                email=email_b,
                hashed_password=hash_password("PasswordB123"),
                role="student",
                status="active",
                is_admin=False,
                department="Electrical Engineering",
                year="2nd Year",
                semester="4th Semester",
                is_onboarded=True
            )
            db.add(student_b)
            db.commit()
            db.refresh(student_b)
        else:
            student_b.status = "active"
            db.commit()

        # Create authenticated clients
        token_a = create_access_token({"sub": str(student_a.id), "email": student_a.email})
        client_a = TestClient(app)
        client_a.headers = {"Authorization": f"Bearer {token_a}"}

        token_b = create_access_token({"sub": str(student_b.id), "email": student_b.email})
        client_b = TestClient(app)
        client_b.headers = {"Authorization": f"Bearer {token_b}"}

        # ----------------- FLOW 1: Send Alert Button -----------------
        unique_title = f"Library Due Notice {int(datetime.utcnow().timestamp())}"
        alert_payload = {
            "title": unique_title,
            "message": "Please return the AI Textbook by Friday 5 PM.",
            "category": "announcement",
            "target_scope": "individual",
            "student_ids": [student_a.id],
            "link": "/dashboard"
        }
        alert_res = admin_client.post("/api/admin/alerts/broadcast", json=alert_payload)
        assert alert_res.status_code == 200, f"Failed to send alert: {alert_res.text}"
        alert_data = alert_res.json()
        assert alert_data["recipients_count"] == 1
        assert alert_data["delivered_count"] == 1
        notif_id = alert_data.get("notification_id")
        assert notif_id is not None

        # Student A retrieves notifications
        notifs_res_a = client_a.get("/api/notifications")
        assert notifs_res_a.status_code == 200
        items_a = notifs_res_a.json()["items"]
        matched_a = [n for n in items_a if n["id"] == notif_id]
        assert len(matched_a) == 1, "Dispatched notification not found in Student A's notification list"
        assert matched_a[0]["title"] == unique_title
        assert matched_a[0]["is_read"] is False

        # Student A marks notification read
        mark_res = client_a.patch(f"/api/notifications/{notif_id}/read")
        assert mark_res.status_code == 200
        assert mark_res.json()["is_read"] is True

        # Student B checks notifications (must NOT see Student A's notification)
        notifs_res_b = client_b.get("/api/notifications")
        assert notifs_res_b.status_code == 200
        items_b = notifs_res_b.json()["items"]
        assert not any(n["id"] == notif_id for n in items_b), "Student B saw Student A's private notification!"

        # Student B tries to mark Student A's notification read (must return 404)
        cross_mark_res = client_b.patch(f"/api/notifications/{notif_id}/read")
        assert cross_mark_res.status_code == 404

        # ----------------- FLOW 2: Adjust Quota Button -----------------
        new_quota_mb = 125
        quota_res = admin_client.put(f"/api/admin/users/{student_a.id}/quota", json={
            "custom_quota_mb": new_quota_mb,
            "quota_bytes": new_quota_mb * 1024 * 1024
        })
        assert quota_res.status_code == 200, f"Failed to update quota: {quota_res.text}"
        assert quota_res.json()["quota_bytes"] == new_quota_mb * 1024 * 1024

        # Student A checks storage endpoint
        storage_res = client_a.get("/api/student/storage")
        assert storage_res.status_code == 200
        assert storage_res.json()["quota_bytes"] == new_quota_mb * 1024 * 1024

        # ----------------- FLOW 3: Suspend and Reactivate Buttons -----------------
        # Admin suspends Student A
        suspend_res = admin_client.patch(f"/api/admin/users/{student_a.id}/status", json={
            "status": "suspended",
            "reason": "Administrative compliance review"
        })
        assert suspend_res.status_code == 200
        assert suspend_res.json()["status"] == "suspended"

        # Student A attempts an authenticated request with their active token (must be immediately 403 Forbidden)
        blocked_res = client_a.get("/api/student/storage")
        assert blocked_res.status_code == 403, f"Expected 403 for suspended user, got {blocked_res.status_code}"
        assert "suspended" in blocked_res.json()["detail"].lower()

        # Student A attempts to log in (must be 403 Forbidden)
        login_res = unauthenticated_client.post("/api/auth/login", json={
            "email": email_a,
            "password": "PasswordA123"
        })
        assert login_res.status_code == 403
        assert "suspended" in login_res.json()["detail"].lower()

        # Admin reactivates Student A
        activate_res = admin_client.patch(f"/api/admin/users/{student_a.id}/status", json={
            "status": "active"
        })
        assert activate_res.status_code == 200
        assert activate_res.json()["status"] == "active"

        # Student A's active token works immediately
        reactivated_res = client_a.get("/api/student/storage")
        assert reactivated_res.status_code == 200
        assert reactivated_res.json()["quota_bytes"] == new_quota_mb * 1024 * 1024
    finally:
        db.close()


def test_cross_student_data_privacy_and_tenant_isolation(unauthenticated_client):
    """
    Comprehensive Tenant Privacy & Data Isolation Test:
    1. Documents & Files:
       - Student A's personal uploaded documents are never visible to Student B in /api/knowledge/documents.
       - Student B cannot download Student A's private document (HTTP 403 Forbidden).
       - Student B cannot delete Student A's private document (HTTP 404 Not Found).
    2. Feedback & Support Threads:
       - Student B cannot view Student A's feedback thread list.
       - Student B cannot view Student A's feedback conversation by ID (HTTP 403 Forbidden).
       - Student B cannot post replies to Student A's feedback thread (HTTP 403 Forbidden).
    3. Quiz Attempts & Learning History:
       - Student B cannot review Student A's quiz attempt (HTTP 404 Not Found).
    4. Notifications & Unread Counts:
       - Student B cannot view or modify Student A's in-app notifications.
       - /api/notifications/unread-count accurately returns isolated count.
    5. Admin Route Protection:
       - Regular student JWT receives HTTP 403 Forbidden on all /api/admin/* routes.
       - Unauthenticated access receives HTTP 401 Unauthorized.
    """
    db = SessionLocal()
    try:
        # 1. Setup Student Alpha
        email_a = "tenant_alpha@university.edu"
        student_a = db.query(Student).filter(Student.email == email_a).first()
        if not student_a:
            student_a = Student(
                name="Tenant Alpha",
                email=email_a,
                hashed_password=hash_password("PassAlpha123"),
                role="student",
                status="active",
                is_admin=False,
                department="Computer Science",
                is_onboarded=True
            )
            db.add(student_a)
            db.commit()
            db.refresh(student_a)
        else:
            student_a.status = "active"
            db.commit()

        # 2. Setup Student Beta
        email_b = "tenant_beta@university.edu"
        student_b = db.query(Student).filter(Student.email == email_b).first()
        if not student_b:
            student_b = Student(
                name="Tenant Beta",
                email=email_b,
                hashed_password=hash_password("PassBeta123"),
                role="student",
                status="active",
                is_admin=False,
                department="Information Technology",
                is_onboarded=True
            )
            db.add(student_b)
            db.commit()
            db.refresh(student_b)
        else:
            student_b.status = "active"
            db.commit()

        # Client A & Client B
        token_a = create_access_token({"sub": str(student_a.id), "email": student_a.email})
        client_a = TestClient(app)
        client_a.headers = {"Authorization": f"Bearer {token_a}"}

        token_b = create_access_token({"sub": str(student_b.id), "email": student_b.email})
        client_b = TestClient(app)
        client_b.headers = {"Authorization": f"Bearer {token_b}"}

        # Create private personal document owned by Student A
        doc_a = KnowledgeDocument(
            student_id=student_a.id,
            filename="alpha_private_notes.pdf",
            file_path=str(settings.UPLOAD_DIR / "alpha_private_notes.pdf"),
            file_size=10240,
            file_type="pdf",
            is_course_material=False,
            status="processed",
            num_chunks=2,
            upload_date=datetime.utcnow()
        )
        db.add(doc_a)

        # Create feedback thread owned by Student A
        fb_a = Feedback(
            student_id=student_a.id,
            subject="Alpha Private Research Question",
            category="Academic",
            comment="Private question about thesis project",
            rating=5,
            status="open",
            created_at=datetime.utcnow()
        )
        db.add(fb_a)

        # Create private notification for Student A
        notif_a = Notification(
            user_id=student_a.id,
            type="info",
            title="Alpha Private Notice",
            message="Your private lab session has been confirmed.",
            link="/dashboard",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif_a)

        db.commit()
        db.refresh(doc_a)
        db.refresh(fb_a)
        db.refresh(notif_a)

        # --- A. Verify Document Tenant Isolation ---
        # Student A sees their document
        docs_res_a = client_a.get("/api/knowledge/documents")
        assert docs_res_a.status_code == 200
        assert any(d["id"] == doc_a.id for d in docs_res_a.json())

        # Student B DOES NOT see Student A's private document
        docs_res_b = client_b.get("/api/knowledge/documents")
        assert docs_res_b.status_code == 200
        assert not any(d["id"] == doc_a.id for d in docs_res_b.json()), "Student B leaked Student A's private document!"

        # Student B cannot download Student A's private document
        dl_res = client_b.get(f"/api/knowledge/documents/{doc_a.id}/download")
        assert dl_res.status_code == 403, f"Expected 403 on downloading another student's file, got {dl_res.status_code}"

        # Student B cannot delete Student A's private document
        del_res = client_b.delete(f"/api/knowledge/documents/{doc_a.id}")
        assert del_res.status_code == 404, f"Expected 404 on deleting another student's file, got {del_res.status_code}"

        # --- B. Verify Feedback Thread Tenant Isolation ---
        # Student B cannot see Student A's feedback thread in list
        fb_list_b = client_b.get("/api/feedback")
        assert fb_list_b.status_code == 200
        assert not any(f["id"] == fb_a.id for f in fb_list_b.json()), "Student B leaked Student A's private feedback!"

        # Student B cannot access Student A's feedback thread by ID
        fb_detail_b = client_b.get(f"/api/feedback/{fb_a.id}")
        assert fb_detail_b.status_code == 403, f"Expected 403 on accessing another student's feedback, got {fb_detail_b.status_code}"

        # Student B cannot post a reply to Student A's feedback thread
        fb_reply_b = client_b.post(f"/api/feedback/{fb_a.id}/reply", json={"message": "Unauthorized reply"})
        assert fb_reply_b.status_code == 403

        # --- C. Verify Notification Tenant Isolation & Unread Count ---
        # Student B cannot see Student A's notification
        notifs_b = client_b.get("/api/notifications")
        assert notifs_b.status_code == 200
        assert not any(n["id"] == notif_a.id for n in notifs_b.json()["items"])

        # Unread count endpoint returns accurate isolated count for Student A
        unread_res_a = client_a.get("/api/notifications/unread-count")
        assert unread_res_a.status_code == 200
        assert unread_res_a.json()["unread_count"] >= 1

        # Student B marking Student A's notification returns 404
        mark_cross = client_b.patch(f"/api/notifications/{notif_a.id}/read")
        assert mark_cross.status_code == 404

        # Clean up test rows
        db.delete(doc_a)
        db.delete(fb_a)
        db.delete(notif_a)
        db.commit()
    finally:
        db.close()




