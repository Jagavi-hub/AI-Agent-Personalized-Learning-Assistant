import os
import sys
import json
import pytest
from datetime import datetime

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.init_db import init_db
from app.core.security import hash_password
from app.models.entities import Student, Feedback, FeedbackReply, Notification, AuditLog

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def unauthenticated_client():
    return TestClient(app)

@pytest.fixture
def admin_client():
    client = TestClient(app)
    res = client.post("/api/auth/login", json={
        "email": "jagavi.raju@university.edu",
        "password": "LearnAI2026Secure"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    token = res.json()["access_token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

@pytest.fixture
def student_a_client():
    client = TestClient(app)
    db = SessionLocal()
    try:
        email = "student.alpha@university.edu"
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            student = Student(
                name="Alpha Student",
                email=email,
                hashed_password=hash_password("PasswordAlpha123"),
                role="student",
                is_admin=False,
                department="Computer Science",
                year="3rd Year",
                semester="5th Semester",
                is_onboarded=True
            )
            db.add(student)
            db.commit()
            db.refresh(student)

        res = client.post("/api/auth/login", json={
            "email": email,
            "password": "PasswordAlpha123"
        })
        assert res.status_code == 200, f"Student Alpha login failed: {res.text}"
        token = res.json()["access_token"]
        client.headers = {"Authorization": f"Bearer {token}"}
        return client
    finally:
        db.close()

@pytest.fixture
def student_b_client():
    client = TestClient(app)
    db = SessionLocal()
    try:
        email = "student.beta@university.edu"
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            student = Student(
                name="Beta Student",
                email=email,
                hashed_password=hash_password("PasswordBeta123"),
                role="student",
                is_admin=False,
                department="Information Technology",
                year="2nd Year",
                semester="3rd Semester",
                is_onboarded=True
            )
            db.add(student)
            db.commit()
            db.refresh(student)

        res = client.post("/api/auth/login", json={
            "email": email,
            "password": "PasswordBeta123"
        })
        assert res.status_code == 200, f"Student Beta login failed: {res.text}"
        token = res.json()["access_token"]
        client.headers = {"Authorization": f"Bearer {token}"}
        return client
    finally:
        db.close()


# 1. Feedback Submission Validation
def test_feedback_submission_validation(student_a_client):
    # Too short subject (< 3 chars)
    res1 = student_a_client.post("/api/feedback", json={
        "subject": "H",
        "category": "Bug Report",
        "priority": "Normal",
        "comment": "This is a detailed bug description.",
        "rating": 3
    })
    assert res1.status_code == 422

    # Too short comment (< 10 chars)
    res2 = student_a_client.post("/api/feedback", json={
        "subject": "Valid Subject Title",
        "category": "Bug Report",
        "priority": "Normal",
        "comment": "Short",
        "rating": 3
    })
    assert res2.status_code == 422

    # Invalid rating (> 5)
    res3 = student_a_client.post("/api/feedback", json={
        "subject": "Valid Subject Title",
        "category": "Bug Report",
        "priority": "Normal",
        "comment": "This is a detailed bug description.",
        "rating": 6
    })
    assert res3.status_code == 422


# 2. End-to-End Submission, Persistence & Priority
def test_feedback_submission_and_persistence(student_a_client, admin_client):
    res = student_a_client.post("/api/feedback", json={
        "subject": "Quiz Generation Timeout on Chapter 4",
        "category": "Quiz Issue",
        "priority": "High",
        "related_course": "CS401",
        "comment": "When generating 10 questions for CS401, the assistant times out after 30 seconds.",
        "rating": 2
    })
    assert res.status_code == 200
    data = res.json()
    assert data["subject"] == "Quiz Generation Timeout on Chapter 4"
    assert data["category"] == "Quiz Issue"
    assert data["priority"] == "High"
    assert data["related_course"] == "CS401"
    assert data["status"] == "open"
    ticket_id = data["id"]

    # Verify admin feedback queue has this ticket
    admin_list_res = admin_client.get("/api/admin/feedback")
    assert admin_list_res.status_code == 200
    admin_tickets = admin_list_res.json()
    matching = [t for t in admin_tickets if t["id"] == ticket_id]
    assert len(matching) == 1
    assert matching[0]["priority"] == "High"
    assert matching[0]["related_course"] == "CS401"
    assert matching[0]["student_name"] == "Alpha Student"


# 3. Strict Student Tenant Isolation & Privacy
def test_student_tenant_isolation(student_a_client, student_b_client):
    # Student A creates a ticket
    create_res = student_a_client.post("/api/feedback", json={
        "subject": "Confidential Grade Inquiry",
        "category": "General Feedback",
        "priority": "Normal",
        "comment": "I have an inquiry regarding my final score breakdown in Algorithms.",
        "rating": 5
    })
    assert create_res.status_code == 200
    ticket_id = create_res.json()["id"]

    # Student B queries their own feedback list -> Student A's ticket must NOT appear
    b_list_res = student_b_client.get("/api/feedback")
    assert b_list_res.status_code == 200
    b_tickets = b_list_res.json()
    assert not any(t["id"] == ticket_id for t in b_tickets)

    # Student B attempts direct GET of Student A's ticket -> 403 Forbidden
    b_view_res = student_b_client.get(f"/api/feedback/{ticket_id}")
    assert b_view_res.status_code == 403
    assert "forbidden" in b_view_res.json()["detail"].lower()

    # Student B attempts to post a reply on Student A's ticket -> 403 Forbidden
    b_reply_res = student_b_client.post(f"/api/feedback/{ticket_id}/reply", json={
        "message": "Attempting unauthorized snooping reply."
    })
    assert b_reply_res.status_code == 403

    # Student B attempts to alter status of Student A's ticket -> 403 Forbidden
    b_status_res = student_b_client.patch(f"/api/feedback/{ticket_id}/status", json={
        "status": "resolved"
    })
    assert b_status_res.status_code == 403


# 4. Non-Admin Blocked from Administrative Feedback Endpoints
def test_student_blocked_from_admin_feedback_endpoints(student_a_client):
    # Attempt to access admin feedback list
    res1 = student_a_client.get("/api/admin/feedback")
    assert res1.status_code == 403

    # Attempt to reply via admin endpoint
    res2 = student_a_client.post("/api/admin/feedback/1/reply", json={
        "message": "Faux admin reply"
    })
    assert res2.status_code == 403

    # Attempt to update status via admin endpoint
    res3 = student_a_client.patch("/api/admin/feedback/1/status", json={
        "status": "resolved"
    })
    assert res3.status_code == 403


# 5. Full Two-Way Conversation Flow and Safe Notification Routing
def test_feedback_conversation_and_notification_links(student_a_client, admin_client):
    # 1. Student creates ticket
    fb_res = student_a_client.post("/api/feedback", json={
        "subject": "Missing Lecture 7 Slide in Database Systems",
        "category": "Upload/Storage Issue",
        "priority": "Normal",
        "related_course": "CS302",
        "comment": "Slide 24 from the SQL indexing lecture appears blank.",
        "rating": 4
    })
    assert fb_res.status_code == 200
    ticket_id = fb_res.json()["id"]

    # 2. Admin replies to ticket
    admin_reply_res = admin_client.post(f"/api/admin/feedback/{ticket_id}/reply", json={
        "message": "We have re-indexed the PDF for CS302. Please check again."
    })
    assert admin_reply_res.status_code == 200
    assert admin_reply_res.json()["sender_role"] == "admin"

    # 3. Verify notification created for Student A
    stu_notifs_res = student_a_client.get("/api/notifications")
    assert stu_notifs_res.status_code == 200
    notifs = stu_notifs_res.json().get("items", [])
    matching_notifs = [n for n in notifs if "CS302" in n["title"] or str(ticket_id) in (n.get("link") or "") or "feedback" in (n.get("link") or "")]
    assert len(matching_notifs) >= 1
    # Ensure link is safe student link (/feedback) and not an admin link
    target_link = matching_notifs[0].get("link")
    assert target_link is not None
    assert not target_link.startswith("/admin")
    assert target_link.startswith("/feedback")

    # 4. Student replies back
    stu_reply_res = student_a_client.post(f"/api/feedback/{ticket_id}/reply", json={
        "message": "Verified! The slide is now showing correctly. Thank you!"
    })
    assert stu_reply_res.status_code == 200
    assert stu_reply_res.json()["sender_role"] == "student"

    # 5. Verify thread shows both replies in chronological order
    thread_res = student_a_client.get(f"/api/feedback/{ticket_id}")
    assert thread_res.status_code == 200
    thread_data = thread_res.json()
    assert len(thread_data["replies"]) == 2
    assert thread_data["replies"][0]["sender_role"] == "admin"
    assert thread_data["replies"][1]["sender_role"] == "student"
    assert thread_data["status"] == "awaiting_admin"


# 6. Feedback Resolution Restricted to Admins Only
def test_feedback_resolution_restricted_to_admins(student_a_client, admin_client):
    # 1. Student creates ticket
    fb_res = student_a_client.post("/api/feedback", json={
        "subject": "Audio stutter in AI Tutor voice explanation",
        "category": "AI Tutor/RAG Issue",
        "priority": "Low",
        "comment": "Voice synthesis has occasional micro-pauses in browser.",
        "rating": 4
    })
    assert fb_res.status_code == 200
    ticket_id = fb_res.json()["id"]

    # 2. Student attempts to mark ticket resolved -> STRICTLY FORBIDDEN (403)
    stu_resolve_res = student_a_client.patch(f"/api/feedback/{ticket_id}/status", json={
        "status": "resolved"
    })
    assert stu_resolve_res.status_code == 403
    assert "only administrators" in stu_resolve_res.json()["detail"].lower()

    # 3. Student attempts to reopen ticket -> STRICTLY FORBIDDEN (403)
    stu_reopen_res = student_a_client.patch(f"/api/feedback/{ticket_id}/status", json={
        "status": "reopened"
    })
    assert stu_reopen_res.status_code == 403

    # 4. Administrator marks ticket resolved -> 200 OK
    admin_resolve_res = admin_client.patch(f"/api/admin/feedback/{ticket_id}/status", json={
        "status": "resolved"
    })
    assert admin_resolve_res.status_code == 200
    assert admin_resolve_res.json()["status"] == "resolved"

    # 5. Student views ticket -> status is resolved
    stu_view_res = student_a_client.get(f"/api/feedback/{ticket_id}")
    assert stu_view_res.status_code == 200
    assert stu_view_res.json()["status"] == "resolved"

    # 6. Student received in-app notification about ticket resolution
    stu_notifs_res = student_a_client.get("/api/notifications")
    assert stu_notifs_res.status_code == 200
    items = stu_notifs_res.json().get("items", [])
    matching = [n for n in items if "resolved" in n["title"].lower() or "resolved" in n["message"].lower() or str(ticket_id) in n["message"]]
    assert len(matching) >= 1
    assert matching[0]["link"] == "/feedback"
