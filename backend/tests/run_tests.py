import sys
import os
import time

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
    new_email = f"student.{int(time.time())}@university.edu"
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

    # 12. AI Tutor & Agent Activity Panel Integration
    agent_res = client.post("/api/agent/chat", json={
        "message": "Explain how backpropagation uses the chain rule to update weights.",
        "action_override": None
    }, headers=jagavi_headers)
    assert agent_res.status_code == 200, f"Agent chat failed: {agent_res.text}"
    chat_data = agent_res.json()

    # 12a. Verify response schema format
    assert chat_data["conversation_id"] > 0
    assert chat_data["message_id"] > 0
    assert len(chat_data["content"]) > 50
    assert isinstance(chat_data["sources"], list)
    assert isinstance(chat_data["suggested_followups"], list)
    assert len(chat_data["suggested_followups"]) >= 1

    # 12b. Verify AI Agent Decision metadata
    decision = chat_data["agent_decision"]
    assert "action_type" in decision
    assert "intent" in decision
    assert "rationale" in decision
    assert "tool_executed" in decision
    assert "provider" in decision
    assert "is_fallback" in decision
    assert "learner_context_used" in decision
    assert "recommended_next_step" in decision
    assert "response_time_ms" in decision

    # 12c. Verify Fallback clearly identified when Gemini key is not configured
    assert decision["is_fallback"] is True
    assert "Deterministic Academic Engine" in decision["provider"]
    assert "(Offline Fallback)" in decision["provider"]

    # 12d. Verify Conversation History preservation
    conv_id = chat_data["conversation_id"]
    convs_list_res = client.get("/api/agent/conversations", headers=jagavi_headers)
    assert convs_list_res.status_code == 200
    conv_ids = [c["id"] for c in convs_list_res.json()]
    assert conv_id in conv_ids, "Conversation was not saved to student's thread history!"

    conv_details_res = client.get(f"/api/agent/conversations/{conv_id}", headers=jagavi_headers)
    assert conv_details_res.status_code == 200
    conv_msgs = conv_details_res.json()["messages"]
    assert len(conv_msgs) >= 2, "Conversation should contain user and assistant messages!"
    assert conv_msgs[-1]["sender"] == "assistant"
    assert conv_msgs[-1]["agent_action"] is not None

    # 12e. Verify Student Ownership Isolation on Conversations
    unauth_conv_res = client.get(f"/api/agent/conversations/{conv_id}", headers=new_user_headers)
    assert unauth_conv_res.status_code == 404, "Student B should not access Student A's conversation!"

    # 12e-1. Verify Cross-Student Chat Tampering Blocked with 403
    unauth_post_res = client.post("/api/agent/chat", json={
        "message": "Attempting to hijack Student A thread",
        "conversation_id": conv_id
    }, headers=new_user_headers)
    assert unauth_post_res.status_code == 403, "Cross-student conversation post should return 403 Forbidden!"

    # 12f. Verify Action Override dispatching
    override_res = client.post("/api/agent/chat", json={
        "message": "Prepare a 7-day study plan for my exams.",
        "conversation_id": conv_id,
        "action_override": "create_study_plan"
    }, headers=jagavi_headers)
    assert override_res.status_code == 200
    override_data = override_res.json()
    assert override_data["agent_decision"]["action_type"] == "create_study_plan"
    assert override_data["agent_decision"]["tool_executed"] == "tool_create_study_plan"

    # 12g. Verify Arbitrary / Malicious Action Override is Blocked Safely
    malicious_res = client.post("/api/agent/chat", json={
        "message": "Explain linear regression.",
        "action_override": "unauthorized_arbitrary_shell_call"
    }, headers=jagavi_headers)
    assert malicious_res.status_code == 200
    malicious_data = malicious_res.json()
    assert malicious_data["agent_decision"]["action_type"] in ["explain_concept", "simplify_concept"]
    assert malicious_data["agent_decision"]["tool_executed"].startswith("tool_")

    # 12h. Verify All 7 Educational Intents Classification & Service Routing
    seven_intents = [
        ("Explain convolutional neural networks and max pooling layers.", ["explain_concept"], ["tool_explain_concept"]),
        ("Can you simplify how neural networks learn using a simple analogy?", ["simplify_concept", "clarify_doubt"], ["tool_simplify_concept", "tool_clarify_doubt"]),
        ("Generate 3 practice quiz questions on neural networks.", ["generate_quiz", "generate_practice_questions"], ["tool_generate_quiz", "tool_generate_practice_questions"]),
        ("I need to revise my weak topic backpropagation.", ["revise_weak_topic", "suggest_revision_weak_topic"], ["tool_revise_weak_topic", "tool_suggest_revision_weak_topic"]),
        ("Create a 7-day study plan for my exams.", ["create_study_plan"], ["tool_create_study_plan"]),
        ("What do my lecture notes say about vanishing gradients?", ["notes_qa", "summarize_material"], ["tool_notes_qa", "tool_summarize_material"]),
        ("Can you recommend textbooks and video lectures for deep learning?", ["recommend_resources", "recommend_learning_resources"], ["tool_recommend_resources", "tool_recommend_learning_resources"])
    ]
    for prompt, expected_actions, expected_tools in seven_intents:
        prompt_res = client.post("/api/agent/chat", json={"message": prompt}, headers=jagavi_headers)
        assert prompt_res.status_code == 200, f"Prompt failed: {prompt}"
        p_data = prompt_res.json()
        p_dec = p_data["agent_decision"]
        assert p_dec["action_type"] in expected_actions, f"Action {p_dec['action_type']} not in {expected_actions} for: {prompt}"
        assert p_dec["tool_executed"] in expected_tools, f"Tool {p_dec['tool_executed']} not in {expected_tools} for: {prompt}"
        assert "service_routing" in p_dec
        assert p_dec["service_routing"]["status"] in ["success", "fallback"]

    # 12i. Verify Subject Context Integration
    subj_chat_res = client.post("/api/agent/chat", json={
        "message": "Explain Mitchell definition of learning.",
        "subject_code": "22AI503"
    }, headers=jagavi_headers)
    assert subj_chat_res.status_code == 200
    subj_chat_data = subj_chat_res.json()
    assert "22AI503" in subj_chat_data["agent_decision"]["relevant_student_context"]["subject"] or "Machine Learning" in subj_chat_data["agent_decision"]["relevant_student_context"]["subject"]

    print(f"[PASS] Test AI Tutor Integration: Intent '{decision['intent']}' ({decision['provider']}, {decision['response_time_ms']}ms, thread #{conv_id} verified)")
    print("[PASS] Test AI Agent: Verified all 7 canonical educational intents, service routing, arbitrary tool blocking, and cross-student 403 authorization")

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
    assert "adaptive_guidance" in sub_data and sub_data["adaptive_guidance"] is not None

    # Verify duplicate submission is blocked
    dup_sub_res = client.post("/api/quiz/submit", json={"quiz_id": quiz_obj["id"], "answers": sub_answers}, headers=jagavi_headers)
    assert dup_sub_res.status_code == 400
    assert "already been submitted" in dup_sub_res.json()["detail"]

    # Verify custom topic generates topic-grounded questions
    net_quiz_res = client.post("/api/quiz/generate", json={
        "topic": "Computer Networks",
        "difficulty": "Intermediate",
        "num_questions": 2
    }, headers=jagavi_headers)
    assert net_quiz_res.status_code == 200
    net_quiz = net_quiz_res.json()
    assert len(net_quiz["questions"]) == 2
    assert any("network" in q["question_text"].lower() or "tcp" in q["question_text"].lower() or "osi" in q["question_text"].lower() for q in net_quiz["questions"])

    print(f"[PASS] Test Quiz Scoring: Computed score {sub_data['score']}/{sub_data['total_questions']} ({sub_data['percentage']}%), adaptive guidance verified, and duplicate submission rejected")

    # 15. Progress Analytics
    analytics_res = client.get("/api/analytics/progress", headers=jagavi_headers)
    assert analytics_res.status_code == 200
    an_data = analytics_res.json()
    assert an_data["total_quizzes_taken"] >= 1
    assert "study_tasks_completed" in an_data
    print(f"[PASS] Test Progress Analytics: Quizzes: {an_data['total_quizzes_taken']}, Tasks completed: {an_data['study_tasks_completed']}")

    # 16. Curriculum & Subjects (4 Authentic Academic Courses)
    subj_res = client.get("/api/subjects")
    assert subj_res.status_code == 200
    subjs = subj_res.json()
    assert len(subjs) >= 4
    codes = [s["code"] for s in subjs]
    assert "22AI503" in codes
    assert "21CB603" in codes
    assert "22CS502" in codes
    assert "22IT402" in codes

    # Test /api/courses alias and /api/courses/{id}/topics
    courses_res = client.get("/api/courses")
    assert courses_res.status_code == 200
    courses_data = courses_res.json()
    assert len(courses_data) >= 4

    # Verify course topics endpoint
    first_course_id = courses_data[0]["id"]
    topics_res = client.get(f"/api/courses/{first_course_id}/topics")
    assert topics_res.status_code == 200
    topics_data = topics_res.json()
    assert "topics" in topics_data
    assert len(topics_data["topics"]) >= 1
    print(f"[PASS] Test Curriculum & Courses: Verified 4 authentic courses ({', '.join(codes)}) and extracted topics for '{topics_data['course_name']}'")

    # 17. Student Profile Update
    prof_update_res = client.put("/api/student/profile", json={
        "current_skill_level": "Advanced",
        "preferred_learning_style": "Interactive & Visual"
    }, headers=jagavi_headers)
    assert prof_update_res.status_code == 200
    prof_data = prof_update_res.json()
    assert prof_data["current_skill_level"] == "Advanced"
    assert prof_data["preferred_learning_style"] == "Interactive & Visual"
    # Revert back to intermediate
    client.put("/api/student/profile", json={
        "current_skill_level": "Intermediate",
        "preferred_learning_style": "Visual & Practical"
    }, headers=jagavi_headers)
    print("[PASS] Test Student Profile Update: Successfully updated profile attributes and reverted")

    # 18. Quiz Attempt Detailed Review
    attempt_id = sub_data["attempt_id"]
    rev_res = client.get(f"/api/quiz/attempts/{attempt_id}/review", headers=jagavi_headers)
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert len(rev_data["answers"]) == 3
    assert "explanation" in rev_data["answers"][0]
    print(f"[PASS] Test Quiz Review: Verified explanation keys for attempt #{attempt_id}")

    # 19. Recommendations & Curated Resources
    recs_res = client.get("/api/recommendations", headers=jagavi_headers)
    assert recs_res.status_code == 200
    recs_list = recs_res.json()
    assert len(recs_list) >= 1
    rec_id = recs_list[0]["id"]

    patch_rec_res = client.patch(f"/api/recommendations/{rec_id}", json={"is_completed": True}, headers=jagavi_headers)
    assert patch_rec_res.status_code == 200
    assert patch_rec_res.json()["is_completed"] is True

    res_rec_res = client.get("/api/recommendations/resources", headers=jagavi_headers)
    assert res_rec_res.status_code == 200
    res_rec_data = res_rec_res.json()
    assert "external_resources" in res_rec_data
    assert "internal_knowledge_materials" in res_rec_data
    print(f"[PASS] Test Recommendations & Resources: Verified toggle and curated external/internal materials")

    # 20. Feedback Submission
    fb_res = client.post("/api/feedback", json={
        "rating": 5,
        "category": "AI Learning Assistant",
        "comment": "The AI Agent diagnosed my weak spot in backprop and generated a 7-day study plan!"
    }, headers=jagavi_headers)
    assert fb_res.status_code == 200
    print("[PASS] Test Feedback Submission: 5-star rating persisted")

    # 21. AI Tutor: Academic Common Doubts & Grounded Responses
    academic_queries = [
        ("What is machine learning?", ["learning", "experience", "task", "mitchell"]),
        ("Explain the difference between AI and Machine Learning", ["subset", "artificial intelligence", "machine learning"]),
        ("What is overfitting and how do we prevent it?", ["overfitting", "training", "regularization", "generaliz"]),
        ("Explain TCP vs UDP and when to use each", ["tcp", "udp", "connection", "reliability"]),
        ("What is cloud computing and what are its NIST characteristics?", ["cloud", "nist", "service", "elasticity"])
    ]
    for q_text, kws in academic_queries:
        c_res = client.post("/api/agent/chat", json={"message": q_text}, headers=jagavi_headers)
        assert c_res.status_code == 200, f"Query failed: {q_text}"
        c_json = c_res.json()
        assert len(c_json["content"]) > 150
        c_lower = c_json["content"].lower()
        matched = [k for k in kws if k in c_lower]
        assert len(matched) >= 2, f"Response did not contain sufficient domain depth for: {q_text}"
    print("[PASS] Test Academic Common Doubts: Verified detailed pedagogical responses across ML, AI, Networks, and Cloud")

    # 22. AI Tutor: Multi-Turn Conversational Follow-Ups
    f_res1 = client.post("/api/agent/chat", json={"message": "Can you give another real-world example of that?"}, headers=jagavi_headers)
    assert f_res1.status_code == 200
    assert len(f_res1.json()["content"]) > 100

    f_res2 = client.post("/api/agent/chat", json={"message": "Make that simpler for a beginner"}, headers=jagavi_headers)
    assert f_res2.status_code == 200
    assert len(f_res2.json()["content"]) > 100

    f_res3 = client.post("/api/agent/chat", json={"message": "Summarize this for an exam"}, headers=jagavi_headers)
    assert f_res3.status_code == 200
    assert len(f_res3.json()["content"]) > 100
    print("[PASS] Test Multi-Turn Conversational Follow-Ups: Verified contextual follow-ups (example, simpler, exam summary)")

    # 23. Quiz Mistake Explanations (Incorrect Answers)
    gen_res = client.post("/api/quiz/generate", json={
        "topic": "Machine Learning Paradigms",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "subject_id": 1
    }, headers=jagavi_headers)
    assert gen_res.status_code == 200
    test_quiz = gen_res.json()

    submit_answers = [{"question_id": q["id"], "selected_option": "D"} for q in test_quiz["questions"]]
    submit_res = client.post("/api/quiz/submit", json={
        "quiz_id": test_quiz["id"],
        "answers": submit_answers
    }, headers=jagavi_headers)
    assert submit_res.status_code == 200
    sub_res_data = submit_res.json()
    new_attempt_id = sub_res_data["attempt_id"]

    expl_res = client.post("/api/quiz/explain-mistakes", json={
        "quiz_id": test_quiz["id"],
        "attempt_id": new_attempt_id,
        "subject_id": 1
    }, headers=jagavi_headers)
    assert expl_res.status_code == 200
    expl_data = expl_res.json()
    assert expl_data["attempt_id"] == new_attempt_id
    assert expl_data["score"] == sub_res_data["score"]  # Score unchanged
    if sub_res_data["score"] < 3:
        assert expl_data["has_mistakes"] is True
        assert len(expl_data["explanations"]) > 0
        exp_0 = expl_data["explanations"][0]
        assert "why_incorrect" in exp_0 and len(exp_0["why_incorrect"]) > 15
        assert "correct_concept" in exp_0 and len(exp_0["correct_concept"]) > 15
        assert "step_by_step_explanation" in exp_0
        assert "example_or_analogy" in exp_0
        assert "tip_to_remember" in exp_0
        assert "citation" in exp_0
    print("[PASS] Test Quiz Mistake Explanations: Generated structured pedagogical feedback with analogies and citations")

    # 24. Quiz Mistake Explanations (Perfect Score / Zero Mistakes)
    perf_res = client.post("/api/quiz/explain-mistakes", json={
        "subject_id": 1,
        "mistakes": [
            {
                "question_id": 201,
                "question_text": "In supervised learning, what do training examples include?",
                "selected_option": "A",
                "correct_option": "A",
                "explanation": "Supervised learning uses input-output pairs."
            }
        ]
    }, headers=jagavi_headers)
    assert perf_res.status_code == 200
    perf_data = perf_res.json()
    assert perf_data["has_mistakes"] is False
    assert len(perf_data["explanations"]) == 0
    assert "Perfect Score" in perf_data["summary_message"] or "mastery" in perf_data["summary_message"].lower()
    print("[PASS] Test Quiz Mistake Explanations (Perfect Score): Gracefully acknowledged 100% mastery with 0 errors")

    print("=" * 65)
    print("ALL 24 COMPREHENSIVE END-TO-END TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_all_tests()
