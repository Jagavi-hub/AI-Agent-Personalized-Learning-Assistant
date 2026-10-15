import sys
import os
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.init_db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    c = TestClient(app)
    # Log in as seeded student
    res = c.post("/api/auth/login", json={
        "email": "jagavi.raju@university.edu",
        "password": "LearnAI2026Secure"
    })
    if res.status_code == 200:
        token = res.json()["access_token"]
        c.headers = {"Authorization": f"Bearer {token}"}
    return c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data

def test_student_profile(client):
    # 1. Fetch profile
    response = client.get("/api/student/profile")
    assert response.status_code == 200
    profile = response.json()
    assert "Jagavi" in profile["name"]
    assert "AI" in profile["department"] or "Computer Science" in profile["department"]

    # 2. Update profile
    update_payload = {
        "preferred_learning_style": "Interactive & Visual",
        "current_skill_level": "Advanced"
    }
    put_res = client.put("/api/student/profile", json=update_payload)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["preferred_learning_style"] == "Interactive & Visual"
    assert updated["current_skill_level"] == "Advanced"

    # Reset back to intermediate
    client.put("/api/student/profile", json={"current_skill_level": "Intermediate", "preferred_learning_style": "Visual & Practical"})

def test_subjects_list(client):
    response = client.get("/api/subjects")
    assert response.status_code == 200
    subjects = response.json()
    assert len(subjects) >= 4
    codes = [s["code"] for s in subjects]
    assert "22AI503" in codes
    assert "21CB603" in codes
    assert "22CS502" in codes
    assert "22IT402" in codes

    # Also test /api/courses alias
    c_res = client.get("/api/courses")
    assert c_res.status_code == 200
    c_list = c_res.json()
    assert len(c_list) >= 4

def test_ai_agent_orchestration(client):
    # Query related to a weak area (Backpropagation)
    payload = {
        "message": "Explain how backpropagation uses the chain rule to update weights.",
        "action_override": None
    }
    response = client.post("/api/agent/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert "agent_decision" in data
    decision = data["agent_decision"]
    assert "action_type" in decision
    assert "rationale" in decision
    assert "learner_context_used" in decision
    assert len(data["content"]) > 100

def test_ai_agent_all_seven_intents(client):
    test_cases = [
        ("Explain convolutional neural networks and max pooling layers.", ["explain_concept"], ["tool_explain_concept"]),
        ("Can you simplify how neural networks learn using a simple analogy?", ["simplify_concept", "clarify_doubt"], ["tool_simplify_concept", "tool_clarify_doubt"]),
        ("Generate 3 practice quiz questions on neural networks.", ["generate_quiz", "generate_practice_questions"], ["tool_generate_quiz", "tool_generate_practice_questions"]),
        ("I need to revise my weak topic backpropagation.", ["revise_weak_topic", "suggest_revision_weak_topic"], ["tool_revise_weak_topic", "tool_suggest_revision_weak_topic"]),
        ("Create a 7-day study plan for my exams.", ["create_study_plan"], ["tool_create_study_plan"]),
        ("What do my lecture notes say about vanishing gradients?", ["notes_qa", "summarize_material"], ["tool_notes_qa", "tool_summarize_material"]),
        ("Can you recommend textbooks and video lectures for deep learning?", ["recommend_resources", "recommend_learning_resources"], ["tool_recommend_resources", "tool_recommend_learning_resources"])
    ]
    for prompt, expected_actions, expected_tools in test_cases:
        res = client.post("/api/agent/chat", json={"message": prompt})
        assert res.status_code == 200, f"Failed on prompt: {prompt}"
        res_data = res.json()
        dec = res_data["agent_decision"]
        assert dec["action_type"] in expected_actions, f"Action {dec['action_type']} not in {expected_actions} for prompt: {prompt}"
        assert dec["tool_executed"] in expected_tools, f"Tool {dec['tool_executed']} not in {expected_tools} for prompt: {prompt}"
        assert "service_routing" in dec
        assert dec["service_routing"]["status"] in ["success", "fallback"]

def test_ai_agent_arbitrary_tool_blocked(client):
    payload = {
        "message": "Explain linear regression.",
        "action_override": "execute_shell_rm_rf"
    }
    res = client.post("/api/agent/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["agent_decision"]["action_type"] in ["explain_concept", "simplify_concept"]
    assert data["agent_decision"]["tool_executed"].startswith("tool_")

def test_ai_agent_subject_context(client):
    payload = {
        "message": "Explain Mitchell definition of learning.",
        "subject_code": "22AI503"
    }
    res = client.post("/api/agent/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    context = data["agent_decision"]["relevant_student_context"]
    assert "22AI503" in context["subject"] or "Machine Learning" in context["subject"]

def test_ai_agent_study_plan(client):
    payload = {
        "message": "Can you create a 7-day study plan for my exams?",
        "action_override": "create_study_plan"
    }
    response = client.post("/api/agent/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["agent_decision"]["action_type"] == "create_study_plan"
    assert "Study Plan" in data["content"] or "Phase" in data["content"]

def test_knowledge_base_retrieval(client):
    # Check document listing
    res_docs = client.get("/api/knowledge/documents")
    assert res_docs.status_code == 200
    docs = res_docs.json()
    assert len(docs) >= 1

    # Search knowledge base
    search_payload = {"query": "vanishing gradient in backpropagation", "top_k": 2}
    search_res = client.post("/api/knowledge/search", json=search_payload)
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert "vanishing" in results[0]["text"].lower() or "gradient" in results[0]["text"].lower()

def test_quiz_lifecycle(client):
    # 1. Generate Quiz
    gen_payload = {
        "topic": "Backpropagation & Neural Networks",
        "difficulty": "Intermediate",
        "num_questions": 3
    }
    gen_res = client.post("/api/quiz/generate", json=gen_payload)
    assert gen_res.status_code == 200
    quiz = gen_res.json()
    assert quiz["id"] > 0
    assert len(quiz["questions"]) == 3

    # 2. Submit Answers
    # Answer first question with "B", others with "A"
    sub_answers = [
        {"question_id": q["id"], "selected_option": "B"}
        for q in quiz["questions"]
    ]
    sub_payload = {
        "quiz_id": quiz["id"],
        "answers": sub_answers
    }
    sub_res = client.post("/api/quiz/submit", json=sub_payload)
    assert sub_res.status_code == 200
    result = sub_res.json()
    assert "score" in result
    assert "percentage" in result
    assert "results" in result
    assert result["score"] >= 0 and result["score"] <= 3
    assert "adaptive_guidance" in result and result["adaptive_guidance"] is not None

    # Verify duplicate submission is strictly rejected
    dup_res = client.post("/api/quiz/submit", json=sub_payload)
    assert dup_res.status_code == 400
    assert "already been submitted" in dup_res.json()["detail"]

    # 3. Check Attempt Review
    attempt_id = result["attempt_id"]
    rev_res = client.get(f"/api/quiz/attempts/{attempt_id}/review")
    assert rev_res.status_code == 200
    review_data = rev_res.json()
    assert len(review_data["answers"]) == 3
    assert "explanation" in review_data["answers"][0]

def test_progress_analytics(client):
    response = client.get("/api/analytics/progress")
    assert response.status_code == 200
    analytics = response.json()
    assert analytics["total_quizzes_taken"] >= 1
    assert "all_topic_performance" in analytics
    assert "quiz_trend" in analytics
    assert "subject_performance" in analytics

def test_recommendations(client):
    response = client.get("/api/recommendations")
    assert response.status_code == 200
    recs = response.json()
    assert len(recs) >= 1
    rec_id = recs[0]["id"]

    # Toggle completion
    patch_res = client.patch(f"/api/recommendations/{rec_id}", json={"is_completed": True})
    assert patch_res.status_code == 200
    assert patch_res.json()["is_completed"] is True

    # Resource recommendations
    res_rec = client.get("/api/recommendations/resources")
    assert res_rec.status_code == 200
    data = res_rec.json()
    assert "external_resources" in data
    assert "internal_knowledge_materials" in data

def test_feedback(client):
    fb_payload = {
        "rating": 5,
        "category": "AI Learning Assistant",
        "comment": "The agent explained backprop with clarity and pinpointed my weak spots!"
    }
    post_res = client.post("/api/feedback", json=fb_payload)
    assert post_res.status_code == 200
    assert post_res.json()["rating"] == 5

    list_res = client.get("/api/feedback")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

def test_four_core_courses_and_topics(client):
    res = client.get("/api/courses")
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 4
    course_map = {c["id"]: c for c in courses}

    # Verify Course 1: Machine Learning
    c1 = course_map[1]
    assert c1["code"] == "22AI503"
    assert c1["name"] == "Machine Learning"
    assert "ML U1.1" in c1["document_filename"]
    assert c1["status"] == "processed"
    assert c1["num_chunks"] > 0
    assert len(c1["topics"]) > 0

    # Verify Course 2: Artificial Intelligence
    c2 = course_map[2]
    assert c2["code"] == "21CB603"
    assert c2["name"] == "Artificial Intelligence"
    assert "AI 1.1" in c2["document_filename"]
    assert c2["status"] == "processed"
    assert c2["num_chunks"] > 0

    # Verify Course 3: Computer Networks
    c3 = course_map[3]
    assert c3["code"] == "22CS502"
    assert c3["name"] == "Computer Networks"
    assert "CN 1.1" in c3["document_filename"]
    assert c3["status"] == "processed"
    assert c3["num_chunks"] > 0

    # Verify Course 4: Cloud Computing
    c4 = course_map[4]
    assert c4["code"] == "22IT402"
    assert c4["name"] == "Cloud Computing"
    assert "CC 1.1" in c4["document_filename"]
    assert c4["status"] == "processed"
    assert c4["num_chunks"] > 0

    # Verify /api/courses/{id}/topics endpoint
    for cid in [1, 2, 3, 4]:
        t_res = client.get(f"/api/courses/{cid}/topics")
        assert t_res.status_code == 200
        t_data = t_res.json()
        assert t_data["course_id"] == cid
        assert len(t_data["topics"]) > 0

def test_course_isolated_retrieval(client):
    # CN query with subject_id=3
    cn_res = client.post("/api/knowledge/search", json={
        "query": "data communications topology",
        "top_k": 3,
        "subject_id": 3
    })
    assert cn_res.status_code == 200
    cn_results = cn_res.json()
    assert len(cn_results) > 0
    for r in cn_results:
        assert "CN" in r["filename"]

    # ML query with subject_id=1
    ml_res = client.post("/api/knowledge/search", json={
        "query": "Mitchell definition of learning checkers",
        "top_k": 3,
        "subject_id": 1
    })
    assert ml_res.status_code == 200
    ml_results = ml_res.json()
    assert len(ml_results) > 0
    for r in ml_results:
        assert "ML" in r["filename"]

def test_course_quiz_grounding_and_rejection(client):
    # Generate quiz for Machine Learning (subject_id=1)
    ml_q_res = client.post("/api/quiz/generate", json={
        "topic": "Well-Posed Learning Problems",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "subject_id": 1
    })
    assert ml_q_res.status_code == 200
    ml_quiz = ml_q_res.json()
    assert len(ml_quiz["questions"]) == 3

    # Generate quiz for Computer Networks (subject_id=3)
    cn_q_res = client.post("/api/quiz/generate", json={
        "topic": "Network Performance & Latency",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "subject_id": 3
    })
    assert cn_q_res.status_code == 200
    cn_quiz = cn_q_res.json()
    assert len(cn_quiz["questions"]) == 3

def test_ai_academic_common_doubts(client):
    test_queries = [
        ("What is machine learning?", ["learning", "experience", "task", "mitchell", "algorithm"]),
        ("Explain the difference between AI and Machine Learning", ["subset", "artificial intelligence", "machine learning"]),
        ("What is overfitting and how do we prevent it?", ["overfitting", "training", "regularization", "generaliz"]),
        ("Explain TCP vs UDP and when to use each", ["tcp", "udp", "connection", "reliability", "packet"]),
        ("What is cloud computing and what are its NIST characteristics?", ["cloud", "nist", "service", "elasticity", "resource"])
    ]
    for query, expected_keywords in test_queries:
        res = client.post("/api/agent/chat", json={"message": query})
        assert res.status_code == 200, f"Failed on academic query: {query}"
        data = res.json()
        assert "content" in data and len(data["content"]) > 150
        content_lower = data["content"].lower()
        matched = [kw for kw in expected_keywords if kw in content_lower]
        assert len(matched) >= 2, f"Query '{query}' response did not contain expected domain concepts. Got: {data['content'][:200]}"
        assert data["agent_decision"]["tool_executed"].startswith("tool_")

def test_conversational_multi_turn_follow_ups(client):
    # 1. Ask initial question
    r1 = client.post("/api/agent/chat", json={"message": "What is overfitting in machine learning models?"})
    assert r1.status_code == 200
    assert len(r1.json()["content"]) > 100

    # 2. Follow-up: Give another example
    r2 = client.post("/api/agent/chat", json={"message": "Can you give another real-world example of that?"})
    assert r2.status_code == 200
    assert len(r2.json()["content"]) > 100
    assert "example" in r2.json()["content"].lower() or "analogy" in r2.json()["content"].lower()

    # 3. Follow-up: Make it simpler
    r3 = client.post("/api/agent/chat", json={"message": "Make that simpler for a beginner"})
    assert r3.status_code == 200
    assert len(r3.json()["content"]) > 100

    # 4. Follow-up: Summarize for an exam
    r4 = client.post("/api/agent/chat", json={"message": "Summarize this for an exam"})
    assert r4.status_code == 200
    assert len(r4.json()["content"]) > 100
    assert "summary" in r4.json()["content"].lower() or "exam" in r4.json()["content"].lower() or "key" in r4.json()["content"].lower()

def test_quiz_mistake_explanation_flow(client):
    # 1. Generate a quiz for Machine Learning
    gen_res = client.post("/api/quiz/generate", json={
        "topic": "Machine Learning Paradigms",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "subject_id": 1
    })
    assert gen_res.status_code == 200
    quiz = gen_res.json()

    # 2. Intentionally answer all with 'D' to create incorrect answers
    sub_answers = [
        {"question_id": q["id"], "selected_option": "D"}
        for q in quiz["questions"]
    ]
    sub_res = client.post("/api/quiz/submit", json={
        "quiz_id": quiz["id"],
        "answers": sub_answers
    })
    assert sub_res.status_code == 200
    res_data = sub_res.json()
    attempt_id = res_data["attempt_id"]
    recorded_score = res_data["score"]

    # 3. Request mistake explanations via POST /api/quiz/explain-mistakes
    expl_res = client.post("/api/quiz/explain-mistakes", json={
        "quiz_id": quiz["id"],
        "attempt_id": attempt_id,
        "subject_id": 1
    })
    assert expl_res.status_code == 200
    expl_data = expl_res.json()
    assert expl_data["attempt_id"] == attempt_id
    assert expl_data["score"] == recorded_score  # Score MUST be preserved
    assert expl_data["total_questions"] == 3

    if recorded_score < 3:
        assert expl_data["has_mistakes"] is True
        assert len(expl_data["explanations"]) > 0
        first_exp = expl_data["explanations"][0]
        assert "why_incorrect" in first_exp and len(first_exp["why_incorrect"]) > 20
        assert "correct_concept" in first_exp and len(first_exp["correct_concept"]) > 20
        assert "example_or_analogy" in first_exp
        assert "tip_to_remember" in first_exp
        assert first_exp["selected_option"] == "D"

    # 4. Also verify historical attempt explanation endpoint GET /api/quiz/attempts/{id}/explain-mistakes
    hist_res = client.get(f"/api/quiz/attempts/{attempt_id}/explain-mistakes")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["attempt_id"] == attempt_id
    assert hist_data["score"] == recorded_score

def test_quiz_mistake_explanation_perfect_score(client):
    # Test mistake explanation with 0 mistakes (all correct)
    payload = {
        "subject_id": 1,
        "mistakes": [
            {
                "question_id": 101,
                "question_text": "What does Mitchell define as the measure of task performance?",
                "selected_option": "P",
                "correct_option": "P",
                "explanation": "Performance metric P evaluates task T with experience E."
            }
        ]
    }
    res = client.post("/api/quiz/explain-mistakes", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["has_mistakes"] is False
    assert len(data["explanations"]) == 0
    assert "Perfect Score" in data["summary_message"] or "mastery" in data["summary_message"].lower()

def test_dynamic_courses_and_multidoc_aggregation(client):
    # 1. Verify GET /api/courses returns all courses including dynamically linked ones
    res = client.get("/api/courses")
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 5
    
    # 2. Check Big Data course presence
    bd_course = next((c for c in courses if "big data" in c["name"].lower() or c["code"] == "22AI602"), None)
    assert bd_course is not None
    assert bd_course["num_chunks"] > 0
    assert len(bd_course["documents"]) >= 1

    # 3. Check Machine Learning multi-document aggregation
    ml_course = next((c for c in courses if c["id"] == 1), None)
    assert ml_course is not None
    assert len(ml_course["documents"]) >= 2
    assert ml_course["num_chunks"] >= 20
    assert len(ml_course["document_filenames"]) >= 2

    # 4. Verify course topics endpoint aggregates properly
    t_res = client.get(f"/api/courses/{bd_course['id']}/topics")
    assert t_res.status_code == 200
    t_data = t_res.json()
    assert len(t_data["topics"]) > 0
    assert len(t_data["documents"]) >= 1

def test_quiz_document_isolation_and_empty_rejection(client):
    # 1. Generate quiz with specific document_id
    doc_q_res = client.post("/api/quiz/generate", json={
        "topic": "Backpropagation & Neural Networks",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "subject_id": 1,
        "document_id": 1
    })
    assert doc_q_res.status_code == 200
    doc_quiz = doc_q_res.json()
    assert len(doc_quiz["questions"]) == 3

    # 2. Generate quiz for Big Data Analytics
    bd_res = client.post("/api/quiz/generate", json={
        "topic": "Hadoop Ecosystem & HDFS Architecture",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "subject_id": 5
    })
    assert bd_res.status_code == 200
    bd_quiz = bd_res.json()
    assert len(bd_quiz["questions"]) == 3

    # 3. Generate quiz for non-existent document or zero-chunk scenario returns 400
    bad_res = client.post("/api/quiz/generate", json={
        "topic": "Empty Topic",
        "difficulty": "Intermediate",
        "num_questions": 3,
        "subject_id": 99999
    })
    assert bad_res.status_code in [400, 404]

if __name__ == "__main__":
    init_db()
    c = TestClient(app)
    login_res = c.post("/api/auth/login", json={
        "email": "jagavi.raju@university.edu",
        "password": "LearnAI2026Secure"
    })
    if login_res.status_code == 200:
        c.headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    test_health_check(c)
    print("[PASS] test_health_check")
    test_student_profile(c)
    print("[PASS] test_student_profile")
    test_subjects_list(c)
    print("[PASS] test_subjects_list")
    test_four_core_courses_and_topics(c)
    print("[PASS] test_four_core_courses_and_topics")
    test_dynamic_courses_and_multidoc_aggregation(c)
    print("[PASS] test_dynamic_courses_and_multidoc_aggregation")
    test_quiz_document_isolation_and_empty_rejection(c)
    print("[PASS] test_quiz_document_isolation_and_empty_rejection")
    test_course_isolated_retrieval(c)
    print("[PASS] test_course_isolated_retrieval")
    test_course_quiz_grounding_and_rejection(c)
    print("[PASS] test_course_quiz_grounding_and_rejection")
    test_ai_agent_orchestration(c)
    print("[PASS] test_ai_agent_orchestration")
    test_ai_agent_all_seven_intents(c)
    print("[PASS] test_ai_agent_all_seven_intents (7 canonical educational intents)")
    test_ai_agent_arbitrary_tool_blocked(c)
    print("[PASS] test_ai_agent_arbitrary_tool_blocked")
    test_ai_agent_subject_context(c)
    print("[PASS] test_ai_agent_subject_context")
    test_ai_agent_study_plan(c)
    print("[PASS] test_ai_agent_study_plan")
    test_knowledge_base_retrieval(c)
    print("[PASS] test_knowledge_base_retrieval")
    test_quiz_lifecycle(c)
    print("[PASS] test_quiz_lifecycle")
    test_progress_analytics(c)
    print("[PASS] test_progress_analytics")
    test_recommendations(c)
    print("[PASS] test_recommendations")
    test_feedback(c)
    print("[PASS] test_feedback")
    test_ai_academic_common_doubts(c)
    print("[PASS] test_ai_academic_common_doubts (Academic doubts: ML, AI vs ML, Overfitting, TCP/UDP, Cloud)")
    test_conversational_multi_turn_follow_ups(c)
    print("[PASS] test_conversational_multi_turn_follow_ups (Multi-turn follow-ups & context)")
    test_quiz_mistake_explanation_flow(c)
    print("[PASS] test_quiz_mistake_explanation_flow (Why incorrect, correct concept, analogy, tips)")
    test_quiz_mistake_explanation_perfect_score(c)
    print("[PASS] test_quiz_mistake_explanation_perfect_score (0 mistakes / perfect score handling)")
    print("=" * 60)
    print("ALL test_backend.py TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

