import os
import sys
import pytest
from datetime import datetime

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.init_db import init_db
from app.core.security import hash_password
from app.models.entities import Student, KnowledgeDocument, DocumentChunk, DocumentExplanation, Subject

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def unauthenticated_client():
    return TestClient(app)

@pytest.fixture
def student_alice_client():
    client = TestClient(app)
    db = SessionLocal()
    try:
        email = "alice.explainer@university.edu"
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            student = Student(
                name="Alice Explainer",
                email=email,
                hashed_password=hash_password("AliceSecurePass123!"),
                role="student",
                is_admin=False,
                department="Information Technology",
                year="3rd Year",
                semester="6th Semester",
                is_onboarded=True
            )
            db.add(student)
            db.commit()
            db.refresh(student)

        res = client.post("/api/auth/login", json={
            "email": email,
            "password": "AliceSecurePass123!"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        token = res.json()["access_token"]
        client.headers = {"Authorization": f"Bearer {token}"}
        return client
    finally:
        db.close()

@pytest.fixture
def student_bob_client():
    client = TestClient(app)
    db = SessionLocal()
    try:
        email = "bob.explainer@university.edu"
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            student = Student(
                name="Bob Explainer",
                email=email,
                hashed_password=hash_password("BobSecurePass123!"),
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
            "email": email,
            "password": "BobSecurePass123!"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        token = res.json()["access_token"]
        client.headers = {"Authorization": f"Bearer {token}"}
        return client
    finally:
        db.close()

@pytest.fixture
def sample_course_document():
    """Ensure a verified course material document exists in the database with chunks."""
    db = SessionLocal()
    try:
        doc = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.is_course_material == True
        ).first()

        if not doc:
            subj = db.query(Subject).first()
            doc = KnowledgeDocument(
                filename="Cloud_Computing_NIST_Module1.pdf",
                file_path="data/course_materials/Cloud_Computing_NIST_Module1.pdf",
                file_size=1024 * 350,
                status="ready",
                num_chunks=4,
                extracted_topics='["NIST Cloud Model", "Service Models", "Deployment Models", "Resource Pooling"]',
                is_course_material=True,
                subject_id=subj.id if subj else None,
                upload_date=datetime.utcnow()
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            chunks = [
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=0,
                    text="The NIST definition of cloud computing identifies five essential characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service.",
                    page_number=1
                ),
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=1,
                    text="Cloud computing comprises three primary service models: Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Software as a Service (SaaS).",
                    page_number=2
                ),
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=2,
                    text="Deployment models include Private Cloud, Community Cloud, Public Cloud, and Hybrid Cloud architectures for enterprise workload migration.",
                    page_number=3
                ),
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=3,
                    text="Exam Revision: Compare multi-tenancy trade-offs and hypervisor isolation risks in shared resource pooling environments.",
                    page_number=4
                ),
            ]
            db.add_all(chunks)
            db.commit()

        return doc.id
    finally:
        db.close()

@pytest.fixture
def alice_private_document(student_alice_client):
    """Create a private uploaded document belonging exclusively to Alice."""
    db = SessionLocal()
    try:
        alice = db.query(Student).filter(Student.email == "alice.explainer@university.edu").first()
        doc = KnowledgeDocument(
            filename="Alice_Private_Research_Thesis.pdf",
            file_path="data/uploads/Alice_Private_Research_Thesis.pdf",
            file_size=1024 * 120,
            status="ready",
            num_chunks=2,
            student_id=alice.id,
            is_course_material=False,
            extracted_topics='["Quantum Key Distribution", "Post-Quantum Cryptography"]',
            upload_date=datetime.utcnow()
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        c1 = DocumentChunk(
            document_id=doc.id,
            chunk_index=0,
            text="Alice's confidential thesis on Quantum Key Distribution (QKD) protocols and BB84 polarization states.",
            page_number=1
        )
        c2 = DocumentChunk(
            document_id=doc.id,
            chunk_index=1,
            text="Post-quantum lattice-based encryption algorithms resistance against Shor's polynomial factorisation.",
            page_number=2
        )
        db.add_all([c1, c2])
        db.commit()

        return doc.id
    finally:
        db.close()


# 1. Unauthenticated requests are rejected
def test_unauthenticated_request_rejected(unauthenticated_client):
    res = unauthenticated_client.get("/api/pdf-explainer/documents")
    assert res.status_code == 401

# 2. List accessible documents returns authorized materials
def test_list_accessible_documents(student_alice_client, sample_course_document):
    res = student_alice_client.get("/api/pdf-explainer/documents")
    assert res.status_code == 200
    docs = res.json()
    assert isinstance(docs, list)
    assert len(docs) > 0

    found = next((d for d in docs if d["id"] == sample_course_document), None)
    assert found is not None
    assert "readable_title" in found
    assert "page_count" in found
    assert found["page_count"] >= 1
    assert "filename" in found
    assert "status" in found

# 3. Get document outline extracts topic boundaries and page numbers
def test_get_document_outline(student_alice_client, sample_course_document):
    res = student_alice_client.get(f"/api/pdf-explainer/documents/{sample_course_document}/outline")
    assert res.status_code == 200
    outline = res.json()
    assert outline["document_id"] == sample_course_document
    assert "topics" in outline
    assert len(outline["topics"]) >= 1
    for topic in outline["topics"]:
        assert "title" in topic
        assert "page_start" in topic
        assert topic["page_start"] >= 1
        assert "page_end" in topic
        assert topic["page_end"] >= topic["page_start"]

# 4. Mode A: Complete PDF Explanation generates structured sections with citations
def test_complete_explanation_mode_a(student_alice_client, sample_course_document):
    res = student_alice_client.post(
        f"/api/pdf-explainer/documents/{sample_course_document}/explain",
        json={"mode": "complete", "force_regenerate": True}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == sample_course_document
    assert data["mode"] == "complete"
    assert "content" in data
    assert len(data["content"]) > 100
    # Must include core educational sections
    content_lower = data["content"].lower()
    assert "overview" in content_lower or "pedagogical" in content_lower
    assert "learning objectives" in content_lower or "objectives" in content_lower
    assert "definitions" in content_lower or "terminology" in content_lower

    # Citations must be populated with authentic page references
    assert "citations" in data
    assert len(data["citations"]) >= 1
    for c in data["citations"]:
        assert "page_number" in c
        assert c["page_number"] >= 1

# 5. Explanation Caching: Subsequent calls return cached version
def test_explanation_caching(student_alice_client, sample_course_document):
    res1 = student_alice_client.post(
        f"/api/pdf-explainer/documents/{sample_course_document}/explain",
        json={"mode": "complete", "force_regenerate": False}
    )
    assert res1.status_code == 200
    assert res1.json()["is_cached"] is True

    # GET endpoint also retrieves cached explanation
    res2 = student_alice_client.get(
        f"/api/pdf-explainer/documents/{sample_course_document}/explanation?mode=complete"
    )
    assert res2.status_code == 200
    assert res2.json()["mode"] == "complete"

# 6. Mode B: Topic-by-Topic explanation deep-dives on specific topic
def test_topic_explanation_mode_b(student_alice_client, sample_course_document):
    # Fetch outline to get a real topic title
    outline_res = student_alice_client.get(f"/api/pdf-explainer/documents/{sample_course_document}/outline")
    first_topic = outline_res.json()["topics"][0]["title"]

    res = student_alice_client.post(
        f"/api/pdf-explainer/documents/{sample_course_document}/explain",
        json={"mode": "topic", "topic": first_topic, "force_regenerate": True}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "topic"
    assert data["topic_title"] == first_topic
    assert len(data["content"]) > 80
    assert "Topic Introduction" in data["content"] or "Breakdown" in data["content"] or "Overview" in data["content"]

# 7. Document Q&A: Strictly grounded within document with page citations
def test_document_qa_grounded(student_alice_client, sample_course_document):
    # Fetch outline to get a real topic title authentically present in this document
    outline_res = student_alice_client.get(f"/api/pdf-explainer/documents/{sample_course_document}/outline")
    first_topic = outline_res.json()["topics"][0]["title"]

    res = student_alice_client.post(
        f"/api/pdf-explainer/documents/{sample_course_document}/ask",
        json={"question": f"What are the foundational principles and details of {first_topic}?"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == sample_course_document
    assert "answer" in data
    assert len(data["citations"]) >= 1
    # Check that citation references valid page number
    cit_pages = [c["page_number"] for c in data["citations"]]
    assert all(p >= 1 for p in cit_pages)

# 8. Document Q&A Off-Topic Guardrail: Does not hallucinate or mix
def test_document_qa_off_topic_guardrail(student_alice_client, sample_course_document):
    res = student_alice_client.post(
        f"/api/pdf-explainer/documents/{sample_course_document}/ask",
        json={"question": "Explain cellular mitosis and DNA replication in mammalian cells"}
    )
    assert res.status_code == 200
    data = res.json()
    # Guardrail detects content is not in this computer science PDF
    assert "does not appear in" in data["answer"].lower() or "not found" in data["answer"].lower()
    assert len(data["citations"]) == 0

# 9. Tenant Isolation: Bob cannot access Alice's private document
def test_tenant_isolation_cross_student_access(student_bob_client, alice_private_document):
    # Bob attempts to get outline of Alice's private document
    res_outline = student_bob_client.get(f"/api/pdf-explainer/documents/{alice_private_document}/outline")
    assert res_outline.status_code == 403

    # Bob attempts to explain Alice's private document
    res_explain = student_bob_client.post(
        f"/api/pdf-explainer/documents/{alice_private_document}/explain",
        json={"mode": "complete"}
    )
    assert res_explain.status_code == 403

    # Bob attempts to ask question about Alice's private document
    res_ask = student_bob_client.post(
        f"/api/pdf-explainer/documents/{alice_private_document}/ask",
        json={"question": "What is quantum key distribution?"}
    )
    assert res_ask.status_code == 403

# 10. Non-existent document returns 404
def test_missing_document_returns_404(student_alice_client):
    res = student_alice_client.get("/api/pdf-explainer/documents/999999/outline")
    assert res.status_code == 404
