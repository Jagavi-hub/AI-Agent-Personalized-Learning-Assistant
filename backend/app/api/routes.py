import os
import json
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_reset_token,
    verify_google_id_token,
)
from app.models.entities import (
    Student, Subject, LearningGoal, LearningActivity,
    Quiz, Question, QuizAttempt, QuizAnswer,
    KnowledgeDocument, DocumentChunk, Conversation, ChatMessage,
    Recommendation, StudyPlan, StudyTask, Feedback
)
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, GoogleAuthRequest, AuthResponse,
    ForgotPasswordRequest, ResetPasswordRequest, OnboardingRequest,
    StudentOut, StudentUpdate, SubjectOut, GoalCreate, GoalUpdate, GoalOut,
    ActivityOut, QuizGenerateRequest, QuizOut, QuizSubmitRequest, QuizSubmitResponse,
    QuizAttemptOut, DocumentOut, DocumentSearchResult, KnowledgeSearchRequest,
    ChatRequest, ChatResponse, ConversationOut, RecommendationOut, RecommendationUpdate,
    StudyPlanOut, StudyTaskOut, StudyPlanGenerateRequest, StudyTaskCreate, StudyTaskUpdate,
    ProgressAnalyticsOut, FeedbackCreate, FeedbackOut
)
from app.agent.orchestrator import agent_orchestrator
from app.services.quiz_service import quiz_service
from app.services.analytics_service import analytics_service
from app.services.planner_service import planner_service
from app.retrieval.engine import retrieval_engine

api_router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Student:
    """Dependency to retrieve and authenticate the current student from Bearer JWT."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    student = db.query(Student).filter(Student.id == int(payload["sub"])).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return student

def format_student_out(student: Student) -> StudentOut:
    return StudentOut(
        id=student.id,
        name=student.name,
        email=student.email,
        department=student.department,
        year=student.year,
        semester=student.semester,
        enrolled_subjects=json.loads(student.enrolled_subjects) if student.enrolled_subjects else [],
        learning_goals=json.loads(student.learning_goals) if student.learning_goals else [],
        preferred_learning_style=student.preferred_learning_style,
        areas_of_interest=json.loads(student.areas_of_interest) if student.areas_of_interest else [],
        current_skill_level=student.current_skill_level,
        auth_provider=student.auth_provider or "local",
        is_onboarded=student.is_onboarded,
        created_at=student.created_at,
        updated_at=student.updated_at
    )

# ----------------- Health Check -----------------
@api_router.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "service": "LearnAI API",
        "version": settings.VERSION,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "google_auth_configured": bool(settings.GOOGLE_CLIENT_ID)
    }

# ----------------- Authentication Endpoints -----------------
@api_router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register_student(req: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Reject duplicate email
    existing = db.query(Student).filter(Student.email == req.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    # 2. Hash password with Argon2
    hashed = hash_password(req.password)

    # 3. Create student record
    student = Student(
        name=req.name.strip(),
        email=req.email.strip().lower(),
        hashed_password=hashed,
        auth_provider="local",
        department=req.department,
        year=req.year,
        semester=req.semester,
        is_onboarded=False,
        enrolled_subjects=json.dumps([]),
        learning_goals=json.dumps([]),
        areas_of_interest=json.dumps([]),
        current_skill_level="Intermediate",
        preferred_learning_style="Visual & Practical"
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Log initial activity
    act = LearningActivity(
        student_id=student.id,
        activity_type="account_created",
        title="Created LearnAI Account",
        description=f"Welcome to LearnAI, {student.name}!",
        timestamp=datetime.utcnow()
    )
    db.add(act)
    db.commit()

    # Generate JWT access token
    token = create_access_token({"sub": str(student.id), "email": student.email})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        student=format_student_out(student),
        is_onboarded=student.is_onboarded
    )

@api_router.post("/auth/login", response_model=AuthResponse, tags=["Authentication"])
def login_student(req: LoginRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == req.email.strip().lower()).first()
    if not student or not student.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, student.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": str(student.id), "email": student.email})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        student=format_student_out(student),
        is_onboarded=student.is_onboarded
    )

@api_router.post("/auth/google", response_model=AuthResponse, tags=["Authentication"])
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Verifies genuine Google ID Token and logs in or creates the student."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="Google Client ID is not configured on the backend. Please add GOOGLE_CLIENT_ID to .env or sign in with your email and password."
        )

    id_info = verify_google_id_token(req.credential)
    if not id_info:
        raise HTTPException(status_code=400, detail="Invalid Google authentication token.")

    email = id_info.get("email", "").strip().lower()
    name = id_info.get("name", "Student")
    google_id = id_info.get("sub")

    if not email:
        raise HTTPException(status_code=400, detail="Google authentication did not provide a valid email.")

    # Find existing student by google_id or email
    student = db.query(Student).filter((Student.google_id == google_id) | (Student.email == email)).first()

    if student:
        # Link google_id if not present
        if not student.google_id:
            student.google_id = google_id
            student.auth_provider = "google"
            db.commit()
    else:
        # Create new student from Google identity
        student = Student(
            name=name,
            email=email,
            google_id=google_id,
            auth_provider="google",
            is_onboarded=False,
            department="Computer Science & Engineering",
            year="3rd Year",
            semester="6th Semester"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    token = create_access_token({"sub": str(student.id), "email": student.email})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        student=format_student_out(student),
        is_onboarded=student.is_onboarded
    )

@api_router.get("/auth/me", response_model=StudentOut, tags=["Authentication"])
def get_current_user_profile(current_user: Student = Depends(get_current_user)):
    return format_student_out(current_user)

@api_router.post("/auth/forgot-password", tags=["Authentication"])
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == req.email.strip().lower()).first()
    if not student:
        # Prevent account enumeration by returning general message
        return {"message": "If an account with that email exists, reset instructions have been generated."}

    token = generate_reset_token()
    student.reset_token = token
    student.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()

    # For academic prototype where SMTP server is optional, provide a clear development-friendly response
    return {
        "message": "Reset token generated successfully.",
        "dev_token": token,
        "note": "In production, this token is securely emailed. For this prototype, use this token on the reset screen."
    }

@api_router.post("/auth/reset-password", tags=["Authentication"])
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.reset_token == req.token).first()
    if not student or not student.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")

    if datetime.utcnow() > student.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    student.hashed_password = hash_password(req.new_password)
    student.reset_token = None
    student.reset_token_expires = None
    db.commit()

    return {"message": "Password updated successfully. You can now sign in with your new password."}

@api_router.post("/auth/logout", tags=["Authentication"])
def logout_user(current_user: Student = Depends(get_current_user)):
    return {"message": "Logged out successfully."}

# ----------------- Student Onboarding -----------------
@api_router.post("/student/onboarding", response_model=StudentOut, tags=["Student"])
def complete_onboarding(
    req: OnboardingRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.department = req.department
    current_user.year = req.year
    current_user.semester = req.semester
    current_user.enrolled_subjects = json.dumps(req.enrolled_subjects)
    current_user.learning_goals = json.dumps(req.learning_goals)
    current_user.preferred_learning_style = req.preferred_learning_style
    current_user.areas_of_interest = json.dumps(req.areas_of_interest)
    current_user.current_skill_level = req.current_skill_level
    current_user.is_onboarded = True
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    act = LearningActivity(
        student_id=current_user.id,
        activity_type="onboarding_completed",
        title="Completed Profile Setup",
        description=f"Department: {current_user.department}, Style: {current_user.preferred_learning_style}",
        timestamp=datetime.utcnow()
    )
    db.add(act)
    db.commit()

    return format_student_out(current_user)

# ----------------- Student Profile -----------------
@api_router.get("/student/profile", response_model=StudentOut, tags=["Student"])
def get_student_profile(current_user: Student = Depends(get_current_user)):
    return format_student_out(current_user)

@api_router.put("/student/profile", response_model=StudentOut, tags=["Student"])
def update_student_profile(
    update_data: StudentUpdate,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.name is not None:
        current_user.name = update_data.name
    if update_data.department is not None:
        current_user.department = update_data.department
    if update_data.year is not None:
        current_user.year = update_data.year
    if update_data.semester is not None:
        current_user.semester = update_data.semester
    if update_data.enrolled_subjects is not None:
        current_user.enrolled_subjects = json.dumps(update_data.enrolled_subjects)
    if update_data.learning_goals is not None:
        current_user.learning_goals = json.dumps(update_data.learning_goals)
    if update_data.preferred_learning_style is not None:
        current_user.preferred_learning_style = update_data.preferred_learning_style
    if update_data.areas_of_interest is not None:
        current_user.areas_of_interest = json.dumps(update_data.areas_of_interest)
    if update_data.current_skill_level is not None:
        current_user.current_skill_level = update_data.current_skill_level

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    act = LearningActivity(
        student_id=current_user.id,
        activity_type="profile_updated",
        title="Updated Profile Details",
        description=f"Skill Level: {current_user.current_skill_level}, Learning Style: {current_user.preferred_learning_style}",
        timestamp=datetime.utcnow()
    )
    db.add(act)
    db.commit()

    return format_student_out(current_user)

# ----------------- Subjects -----------------
@api_router.get("/subjects", response_model=List[SubjectOut], tags=["Curriculum"])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).all()

# ----------------- Learning Activities -----------------
@api_router.get("/student/activities", response_model=List[ActivityOut], tags=["History"])
def list_learning_activities(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(LearningActivity).filter(
        LearningActivity.student_id == current_user.id
    ).order_by(LearningActivity.timestamp.desc()).limit(20).all()

# ----------------- AI Agent & Chat -----------------
@api_router.post("/agent/chat", response_model=ChatResponse, tags=["AI Agent"])
def send_chat_to_agent(
    req: ChatRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be blank.")
    
    result = agent_orchestrator.process_student_request(
        db=db,
        student_id=current_user.id,
        message=req.message,
        conversation_id=req.conversation_id,
        action_override=req.action_override
    )
    return result

@api_router.get("/agent/conversations", tags=["AI Agent"])
def list_conversations(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convs = db.query(Conversation).filter(
        Conversation.student_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    out = []
    for c in convs:
        last_msg = db.query(ChatMessage).filter(ChatMessage.conversation_id == c.id).order_by(ChatMessage.timestamp.desc()).first()
        out.append({
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "last_message": last_msg.content[:80] if last_msg else ""
        })
    return out

@api_router.get("/agent/conversations/{conv_id}", tags=["AI Agent"])
def get_conversation_details(
    conv_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id,
        Conversation.student_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = db.query(ChatMessage).filter(ChatMessage.conversation_id == conv.id).order_by(ChatMessage.timestamp.asc()).all()
    formatted = []
    for m in messages:
        formatted.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender": m.sender,
            "content": m.content,
            "agent_action": json.loads(m.agent_action) if m.agent_action else None,
            "sources": json.loads(m.sources_json) if m.sources_json else [],
            "timestamp": m.timestamp
        })
    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "messages": formatted
    }

@api_router.delete("/agent/conversations/{conv_id}", tags=["AI Agent"])
def delete_conversation(
    conv_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id,
        Conversation.student_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation cleared successfully."}

# ----------------- Quiz & Practice -----------------
@api_router.post("/quiz/generate", response_model=QuizOut, tags=["Quiz"])
def generate_quiz(
    req: QuizGenerateRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = quiz_service.generate_quiz(
        db=db,
        student_id=current_user.id,
        topic=req.topic,
        difficulty=req.difficulty,
        num_questions=req.num_questions,
        subject_id=req.subject_id
    )
    q_out = []
    for q in quiz.questions:
        q_out.append({
            "id": q.id,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "explanation": "",
            "topic": q.topic
        })
    return QuizOut(
        id=quiz.id,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        num_questions=quiz.num_questions,
        questions=q_out,
        created_at=quiz.created_at
    )

@api_router.get("/quiz/{quiz_id}", response_model=QuizOut, tags=["Quiz"])
def get_quiz(
    quiz_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.student_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    q_out = []
    for q in quiz.questions:
        q_out.append({
            "id": q.id,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "explanation": "",
            "topic": q.topic
        })
    return QuizOut(
        id=quiz.id,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        num_questions=quiz.num_questions,
        questions=q_out,
        created_at=quiz.created_at
    )

@api_router.post("/quiz/submit", response_model=QuizSubmitResponse, tags=["Quiz"])
def submit_quiz(
    req: QuizSubmitRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    answers_data = [{"question_id": a.question_id, "selected_option": a.selected_option} for a in req.answers]
    try:
        result = quiz_service.submit_and_score_quiz(
            db=db,
            student_id=current_user.id,
            quiz_id=req.quiz_id,
            submitted_answers=answers_data
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/quiz/attempts/history", tags=["Quiz"])
def list_quiz_attempts(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempts = db.query(QuizAttempt, Quiz).join(
        Quiz, QuizAttempt.quiz_id == Quiz.id
    ).filter(
        QuizAttempt.student_id == current_user.id
    ).order_by(QuizAttempt.completed_at.desc()).all()

    out = []
    for att, q in attempts:
        out.append({
            "id": att.id,
            "quiz_id": att.quiz_id,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "score": att.score,
            "total_questions": att.total_questions,
            "percentage": att.percentage,
            "completed_at": att.completed_at
        })
    return out

@api_router.get("/quiz/attempts/{attempt_id}/review", tags=["Quiz"])
def review_quiz_attempt(
    attempt_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.id == attempt_id,
        QuizAttempt.student_id == current_user.id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
    answers = db.query(QuizAnswer, Question).join(
        Question, QuizAnswer.question_id == Question.id
    ).filter(QuizAnswer.attempt_id == attempt.id).all()

    results = []
    for ans, q in answers:
        results.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "selected_option": ans.selected_option,
            "correct_option": q.correct_option,
            "is_correct": ans.is_correct,
            "explanation": q.explanation,
            "topic": q.topic
        })

    return {
        "attempt_id": attempt.id,
        "quiz_id": quiz.id if quiz else None,
        "topic": quiz.topic if quiz else "Assessment",
        "score": attempt.score,
        "total_questions": attempt.total_questions,
        "percentage": attempt.percentage,
        "completed_at": attempt.completed_at,
        "answers": results
    }

# ----------------- Knowledge Base & Retrieval -----------------
@api_router.get("/knowledge/documents", response_model=List[DocumentOut], tags=["Knowledge Base"])
def list_documents(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(KnowledgeDocument).filter(
        KnowledgeDocument.student_id == current_user.id
    ).order_by(KnowledgeDocument.upload_date.desc()).all()

@api_router.post("/knowledge/upload", response_model=DocumentOut, tags=["Knowledge Base"])
def upload_document(
    file: UploadFile = File(...),
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename or "uploaded_file"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are accepted.")

    save_path = settings.UPLOAD_DIR / f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(save_path)

    doc = retrieval_engine.process_and_store_document(
        db=db,
        student_id=current_user.id,
        filename=filename,
        file_path=save_path,
        file_size=file_size,
        file_type=ext
    )

    act = LearningActivity(
        student_id=current_user.id,
        activity_type="document_uploaded",
        title=f"Uploaded Material: {filename}",
        description=f"Indexed {doc.num_chunks} text chunks for semantic retrieval.",
        timestamp=datetime.utcnow()
    )
    db.add(act)
    db.commit()

    return doc

@api_router.delete("/knowledge/documents/{doc_id}", tags=["Knowledge Base"])
def delete_document(
    doc_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.id == doc_id,
        KnowledgeDocument.student_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass

    db.delete(doc)
    db.commit()
    return {"message": "Document and associated chunks removed successfully."}

@api_router.post("/knowledge/search", response_model=List[DocumentSearchResult], tags=["Knowledge Base"])
def search_knowledge_base(
    req: KnowledgeSearchRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = retrieval_engine.search_relevant_chunks(
        db=db,
        query=req.query,
        student_id=current_user.id,
        top_k=req.top_k
    )
    return results

# ----------------- Personalized Recommendations -----------------
@api_router.get("/recommendations", response_model=List[RecommendationOut], tags=["Recommendations"])
def list_recommendations(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Recommendation).filter(
        Recommendation.student_id == current_user.id
    ).order_by(
        Recommendation.is_completed.asc(),
        Recommendation.priority.asc(),
        Recommendation.created_at.desc()
    ).all()

@api_router.patch("/recommendations/{rec_id}", response_model=RecommendationOut, tags=["Recommendations"])
def toggle_recommendation(
    rec_id: int,
    req: RecommendationUpdate,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(
        Recommendation.id == rec_id,
        Recommendation.student_id == current_user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    rec.is_completed = req.is_completed
    db.commit()
    db.refresh(rec)

    if req.is_completed:
        act = LearningActivity(
            student_id=current_user.id,
            activity_type="recommendation_completed",
            title=f"Completed Recommendation: {rec.title}",
            description=f"Action '{rec.suggested_action}' verified.",
            timestamp=datetime.utcnow()
        )
        db.add(act)
        db.commit()

    return rec

@api_router.get("/recommendations/resources", tags=["Recommendations"])
def get_resource_recommendations(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    perf = analytics_service.get_student_performance_summary(db, current_user.id)
    weak_topic_names = [w["topic"] for w in perf["weak_topics"]]

    curated = [
        {
            "id": 1,
            "title": "Stanford CS229: Machine Learning Lecture Notes",
            "type": "Lecture Notes",
            "source": "Stanford University",
            "topic": "Backpropagation & Gradient Descent",
            "url": "https://cs229.stanford.edu/notes2022fall/cs229-notes1.pdf",
            "reason": "Comprehensive mathematical derivation of the Chain Rule and gradient backpropagation."
        },
        {
            "id": 2,
            "title": "PyTorch Neural Networks Tutorial",
            "type": "Interactive Guide",
            "source": "PyTorch Official",
            "topic": "Backpropagation & Neural Networks",
            "url": "https://pytorch.org/tutorials/beginner/blitz/neural_networks_tutorial.html",
            "reason": "Visual, code-first implementation of torch.autograd backward passes."
        },
        {
            "id": 3,
            "title": "Database Normalization Principles: 1NF to BCNF",
            "type": "Reference Guide",
            "source": "GeeksforGeeks Academic",
            "topic": "Database Normalization",
            "url": "https://www.geeksforgeeks.org/introduction-of-database-normalization/",
            "reason": "Direct examples explaining functional dependency preservation and candidate keys."
        },
        {
            "id": 4,
            "title": "MIT 6.006: Introduction to Algorithms (Dijkstra)",
            "type": "Course Material",
            "source": "MIT OpenCourseWare",
            "topic": "Graph Algorithms",
            "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
            "reason": "Complete proofs for non-negative shortest path complexity and min-heap implementations."
        }
    ]

    docs = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.student_id == current_user.id
    ).all()
    internal_docs = [
        {
            "id": f"internal_{d.id}",
            "title": d.filename,
            "type": "Uploaded Course Document",
            "source": "Course Knowledge Base",
            "topic": "Course Materials",
            "url": f"/knowledge-base",
            "reason": f"Indexed internally with {d.num_chunks} searchable chunks for active RAG."
        }
        for d in docs
    ]

    return {
        "weak_topics_targeted": weak_topic_names,
        "external_resources": curated,
        "internal_knowledge_materials": internal_docs
    }

# ----------------- Study Planner (Module 8) -----------------
@api_router.get("/study-planner/plans", response_model=List[StudyPlanOut], tags=["Study Planner"])
def get_study_plans(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return planner_service.get_plans(db, current_user.id)

@api_router.post("/study-planner/generate", response_model=StudyPlanOut, tags=["Study Planner"])
def generate_study_plan(
    req: StudyPlanGenerateRequest,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = planner_service.generate_plan(
        db=db,
        student_id=current_user.id,
        title=req.title,
        subject=req.subject,
        target_date=req.target_date,
        available_hours_per_week=req.available_hours_per_week,
        focus_weak_topics=req.focus_weak_topics
    )
    return plan

@api_router.post("/study-planner/tasks", response_model=StudyTaskOut, tags=["Study Planner"])
def create_study_task(
    req: StudyTaskCreate,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(StudyPlan).filter(StudyPlan.id == req.plan_id, StudyPlan.student_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found.")

    task = StudyTask(
        plan_id=plan.id,
        student_id=current_user.id,
        topic=req.topic,
        task_description=req.task_description,
        day_of_week=req.day_of_week,
        estimated_minutes=req.estimated_minutes,
        priority=req.priority,
        is_completed=False
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@api_router.patch("/study-planner/tasks/{task_id}", response_model=StudyTaskOut, tags=["Study Planner"])
def update_study_task(
    task_id: int,
    req: StudyTaskUpdate,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.student_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if req.is_completed is not None:
        task.is_completed = req.is_completed
        task.completed_at = datetime.utcnow() if req.is_completed else None
    if req.task_description is not None:
        task.task_description = req.task_description
    if req.estimated_minutes is not None:
        task.estimated_minutes = req.estimated_minutes
    if req.priority is not None:
        task.priority = req.priority

    db.commit()
    db.refresh(task)
    return task

@api_router.delete("/study-planner/tasks/{task_id}", tags=["Study Planner"])
def delete_study_task(
    task_id: int,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(StudyTask).filter(StudyTask.id == task_id, StudyTask.student_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(task)
    db.commit()
    return {"message": "Task removed successfully."}

# ----------------- Learning Goals -----------------
@api_router.get("/goals", response_model=List[GoalOut], tags=["Learning Goals"])
def list_goals(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(LearningGoal).filter(
        LearningGoal.student_id == current_user.id
    ).order_by(LearningGoal.is_completed.asc(), LearningGoal.created_at.desc()).all()

@api_router.post("/goals", response_model=GoalOut, tags=["Learning Goals"])
def create_goal(
    req: GoalCreate,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = LearningGoal(
        student_id=current_user.id,
        title=req.title,
        category=req.category,
        target_date=req.target_date,
        progress=req.progress,
        is_completed=False
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

@api_router.patch("/goals/{goal_id}", response_model=GoalOut, tags=["Learning Goals"])
def update_goal(
    goal_id: int,
    req: GoalUpdate,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(LearningGoal).filter(
        LearningGoal.id == goal_id,
        LearningGoal.student_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")

    if req.title is not None:
        goal.title = req.title
    if req.progress is not None:
        goal.progress = req.progress
        if req.progress >= 100:
            goal.is_completed = True
    if req.is_completed is not None:
        goal.is_completed = req.is_completed
        if req.is_completed and goal.progress < 100:
            goal.progress = 100

    db.commit()
    db.refresh(goal)
    return goal

# ----------------- Progress Analytics -----------------
@api_router.get("/analytics/progress", response_model=ProgressAnalyticsOut, tags=["Analytics"])
def get_progress_analytics(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = analytics_service.get_student_performance_summary(db, current_user.id)
    return summary

# ----------------- Feedback -----------------
@api_router.post("/feedback", response_model=FeedbackOut, tags=["Feedback"])
def submit_feedback(
    req: FeedbackCreate,
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fb = Feedback(
        student_id=current_user.id,
        rating=req.rating,
        category=req.category,
        comment=req.comment
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    act = LearningActivity(
        student_id=current_user.id,
        activity_type="feedback_submitted",
        title=f"Submitted Feedback ({req.rating} ⭐)",
        description=f"Category: {req.category}. {req.comment[:60] if req.comment else ''}",
        timestamp=datetime.utcnow()
    )
    db.add(act)
    db.commit()

    return fb

@api_router.get("/feedback", response_model=List[FeedbackOut], tags=["Feedback"])
def list_feedback(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Feedback).filter(
        Feedback.student_id == current_user.id
    ).order_by(Feedback.created_at.desc()).all()
