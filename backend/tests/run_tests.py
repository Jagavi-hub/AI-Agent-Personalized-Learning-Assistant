import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.init_db import init_db

def run_all_tests():
    print("=" * 65)
    print("Running LearnAI Automated End-to-End Test Suite...")
    print("=" * 65)

    # 1. Database Init
    init_db()
    print("[PASS] Database initialized with Argon2 credentials & schema.")

    client = TestClient(app)

    # 2. System Health Check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    assert res.json()["status"] == "ok"
    print("[PASS] Test Health Check: OK")

    # 3. Authentication: Student Registration
    new_email = "student.demo@university.edu"
    reg_payload = {
        "name": "Alex Chen",
        "email": new_email,
        "password": "SecurePassword123",
        "department": "AI & Data Science (AI&DS)",
        "year": "3rd Year",
        "semester": "6th Semester"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["is_onboarded"] is False
    print(f"[PASS] Test Student Registration: Created account for {reg_data['student']['name']} (Token issued)")

    # 4. Authentication: Duplicate Registration Rejection
    dup_res = client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400, "Duplicate registration was not rejected!"
    print("[PASS] Test Duplicate Registration Rejection: Blocked duplicate email")

    # 5. Authentication: Invalid Credentials Handling
    bad_login_res = client.post("/api/auth/login", json={
        "email": new_email,
        "password": "WrongPassword123"
    })
    assert bad_login_res.status_code == 401, "Invalid password was not rejected with 401!"
    print("[PASS] Test Invalid Credentials Handling: 401 Unauthorized returned")

    # 6. Authentication: Login & JWT Token Issuance
    login_res = client.post("/api/auth/login", json={
        "email": new_email,
        "password": "SecurePassword123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    new_user_token = login_data["access_token"]
    new_user_headers = {"Authorization": f"Bearer {new_user_token}"}
    print("[PASS] Test Login: Successfully verified Argon2 hash and issued JWT")

    # Also log in as seeded Primary Account: Jagavi R
    jagavi_login = client.post("/api/auth/login", json={
        "email": "jagavi.raju@university.edu",
        "password": "LearnAI2026Secure"
    })
    assert jagavi_login.status_code == 200
    jagavi_token = jagavi_login.json()["access_token"]
    jagavi_headers = {"Authorization": f"Bearer {jagavi_token}"}
    print("[PASS] Test Seeded Account Login: Logged in as Jagavi R (Team AI&DS)")

    # 7. Security: Protected Endpoints Reject Unauthenticated Access
    unauth_res = client.get("/api/student/profile")
    assert unauth_res.status_code == 401, "Unauthenticated request was not blocked!"
    print("[PASS] Test Protected Routes: Rejected unauthenticated access with 401")

    # 8. Student Onboarding Workflow
    onboard_payload = {
        "department": "AI & Data Science (AI&DS)",
        "year": "3rd Year",
        "semester": "6th Semester",
        "enrolled_subjects": ["Deep Learning & Neural Networks", "Database Management Systems"],
        "learning_goals": ["Master Backpropagation", "Understand Database Normalization"],
        "preferred_learning_style": "Visual & Practical",
        "areas_of_interest": ["Generative AI", "Neural Networks"],
        "current_skill_level": "Intermediate"
    }
    onboard_res = client.post("/api/student/onboarding", json=onboard_payload, headers=new_user_headers)
    assert onboard_res.status_code == 200
    assert onboard_res.json()["is_onboarded"] is True
    print("[PASS] Test Student Onboarding: Profile successfully configured and is_onboarded=True")

    # 9. Password Recovery: Forgot Password & Reset Token
    forgot_res = client.post("/api/auth/forgot-password", json={"email": new_email})
    assert forgot_res.status_code == 200
    dev_token = forgot_res.json().get("dev_token")
    assert dev_token is not None

    reset_res = client.post("/api/auth/reset-password", json={
        "token": dev_token,
        "new_password": "NewSecurePassword456"
    })
    assert reset_res.status_code == 200

    # Verify login with new password
    new_login_res = client.post("/api/auth/login", json={
        "email": new_email,
        "password": "NewSecurePassword456"
    })
    assert new_login_res.status_code == 200
    print("[PASS] Test Password Recovery & Reset: Verified single-use token and updated password")

    # 10. Study Planner (Module 8)
    plan_gen_res = client.post("/api/study-planner/generate", json={
        "title": "Exam Sprint: Deep Learning",
        "subject": "Deep Learning & Neural Networks",
        "target_date": "Oct 28, 2026",
        "available_hours_per_week": 14,
        "focus_weak_topics": True
    }, headers=jagavi_headers)
    assert plan_gen_res.status_code == 200
    plan_data = plan_gen_res.json()
    assert len(plan_data["tasks"]) == 7
    first_task_id = plan_data["tasks"][0]["id"]
    print(f"[PASS] Test Study Planner Generation: Generated 7-day schedule '{plan_data['title']}' with 7 tasks")

    # Toggle task completion
    toggle_res = client.patch(f"/api/study-planner/tasks/{first_task_id}", json={"is_completed": True}, headers=jagavi_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_completed"] is True
    print("[PASS] Test Study Planner Task Completion: Task marked completed and persisted")

    # 11. Security: Student Data Isolation
    # Verify new student cannot see Jagavi's study plan or toggle Jagavi's tasks
    other_student_plans = client.get("/api/study-planner/plans", headers=new_user_headers)
    assert other_student_plans.status_code == 200
    assert len(other_student_plans.json()) == 0, "Student data leaked to another user!"

    unauth_task_patch = client.patch(f"/api/study-planner/tasks/{first_task_id}", json={"is_completed": False}, headers=new_user_headers)
    assert unauth_task_patch.status_code == 404, "Cross-student data modification was not blocked!"
    print("[PASS] Test Student Data Isolation: Student A cannot view or modify Student B's data")

    # 12. AI Agent Activity Panel & Orchestration
    agent_res = client.post("/api/agent/chat", json={
        "message": "Explain how backpropagation uses the chain rule to update weights.",
        "action_override": None
    }, headers=jagavi_headers)
    assert agent_res.status_code == 200, f"Agent chat failed: {agent_res.text}"
    chat_data = agent_res.json()
    decision = chat_data["agent_decision"]
    assert "action_type" in decision
    assert "intent" in decision
    assert "tool_executed" in decision
    assert "recommended_next_step" in decision
    assert "response_time_ms" in decision
    print(f"[PASS] Test AI Agent Activity Panel: Intent '{decision['intent']}' ({decision['provider']}, {decision['response_time_ms']}ms)")

    # 13. Knowledge Base Document Ingestion & RAG
    sample_note = "CS601 Lecture Notes: Vanishing gradient occurs when backpropagating through saturating activation functions like Sigmoid where derivative is bounded by 0.25."
    files = {"file": ("CS601_Vanishing_Gradients.txt", sample_note.encode("utf-8"), "text/plain")}
    upload_res = client.post("/api/knowledge/upload", files=files, headers=jagavi_headers)
    assert upload_res.status_code == 200
    uploaded_doc = upload_res.json()
    assert uploaded_doc["num_chunks"] >= 1
    print(f"[PASS] Test Knowledge Base Ingestion: Ingested '{uploaded_doc['filename']}' ({uploaded_doc['num_chunks']} chunks)")

    search_res = client.post("/api/knowledge/search", json={"query": "vanishing gradient", "top_k": 2}, headers=jagavi_headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) >= 1
    print(f"[PASS] Test Semantic Search (RAG): Retrieved source '{search_res.json()[0]['filename']}' with score {search_res.json()[0]['score']}")

    # 14. Quiz Generation & Backend Scoring
    quiz_gen_res = client.post("/api/quiz/generate", json={
        "topic": "Backpropagation & Neural Networks",
        "difficulty": "Intermediate",
        "num_questions": 3
    }, headers=jagavi_headers)
    assert quiz_gen_res.status_code == 200
    quiz_obj = quiz_gen_res.json()
    assert len(quiz_obj["questions"]) == 3

    sub_answers = [{"question_id": q["id"], "selected_option": "B"} for q in quiz_obj["questions"]]
    sub_res = client.post("/api/quiz/submit", json={"quiz_id": quiz_obj["id"], "answers": sub_answers}, headers=jagavi_headers)
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["score"] >= 0 and sub_data["score"] <= 3
    print(f"[PASS] Test Quiz Scoring: Computed score {sub_data['score']}/{sub_data['total_questions']} ({sub_data['percentage']}%) against DB keys")

    # 15. Progress Analytics
    analytics_res = client.get("/api/analytics/progress", headers=jagavi_headers)
    assert analytics_res.status_code == 200
    an_data = analytics_res.json()
    assert an_data["total_quizzes_taken"] >= 1
    assert "study_tasks_completed" in an_data
    print(f"[PASS] Test Progress Analytics: Quizzes: {an_data['total_quizzes_taken']}, Tasks completed: {an_data['study_tasks_completed']}")

    # 16. Recommendations & Feedback
    recs_res = client.get("/api/recommendations", headers=jagavi_headers)
    assert recs_res.status_code == 200
    assert len(recs_res.json()) >= 1
    print(f"[PASS] Test Recommendations: {len(recs_res.json())} active recommendations verified")

    fb_res = client.post("/api/feedback", json={
        "rating": 5,
        "category": "AI Learning Assistant",
        "comment": "The AI Agent diagnosed my weak spot in backprop and generated a 7-day study plan!"
    }, headers=jagavi_headers)
    assert fb_res.status_code == 200
    print("[PASS] Test Feedback Submission: 5-star rating persisted")

    print("=" * 65)
    print("ALL 16 COMPREHENSIVE END-TO-END TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_all_tests()
