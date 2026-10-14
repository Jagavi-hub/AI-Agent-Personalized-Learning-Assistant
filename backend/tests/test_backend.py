import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.init_db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

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
    assert profile["name"] == "Jagavi Raju"
    assert "Computer Science" in profile["department"]

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
    assert "CS601" in codes

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
    # Check that answer is rich and educational
    assert len(data["content"]) > 100

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
    assert len(result["results"]) == 3
    # Check that score is computed correctly
    assert result["score"] >= 0 and result["score"] <= 3

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
