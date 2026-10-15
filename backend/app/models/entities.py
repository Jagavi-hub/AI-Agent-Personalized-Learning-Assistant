import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True) # Nullable for pure OAuth accounts
    auth_provider = Column(String(50), default="local") # "local", "google"
    google_id = Column(String(100), unique=True, index=True, nullable=True)
    is_onboarded = Column(Boolean, default=False)
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    department = Column(String(100), default="Computer Science & Engineering")
    year = Column(String(50), default="3rd Year")
    semester = Column(String(50), default="6th Semester")
    enrolled_subjects = Column(Text, default="[]")  # JSON encoded list of subject names/codes
    learning_goals = Column(Text, default="[]")      # JSON encoded list of goals
    preferred_learning_style = Column(String(50), default="Visual & Practical")
    areas_of_interest = Column(Text, default="[]")   # JSON list: ["Artificial Intelligence", "Deep Learning", "Algorithms"]
    current_skill_level = Column(String(50), default="Intermediate")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    goals = relationship("LearningGoal", back_populates="student", cascade="all, delete-orphan")
    activities = relationship("LearningActivity", back_populates="student", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="student", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="student", cascade="all, delete-orphan")
    documents = relationship("KnowledgeDocument", back_populates="student", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="student", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="student", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="student", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="student", cascade="all, delete-orphan")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    department = Column(String(100), default="AI & Data Science (AI&DS)")
    semester = Column(String(50), default="6th Semester")
    description = Column(Text, default="")
    credits = Column(Integer, default=4)
    document_filename = Column(String(255), nullable=True)

    quizzes = relationship("Quiz", back_populates="subject")
    documents = relationship("KnowledgeDocument", back_populates="subject")

    @property
    def document_id(self) -> Optional[int]:
        return self.documents[0].id if self.documents else None

    @property
    def document_filenames(self) -> List[str]:
        if not self.documents:
            return [self.document_filename] if self.document_filename else []
        return [d.filename for d in self.documents if d.filename]

    @property
    def status(self) -> str:
        if not self.documents:
            return "not_indexed"
        statuses = [d.status for d in self.documents]
        if "processing" in statuses:
            return "processing"
        if any(s == "processed" for s in statuses):
            return "processed"
        if all(s == "failed" for s in statuses):
            return "failed"
        return statuses[0] if statuses else "not_indexed"

    @property
    def num_chunks(self) -> int:
        if not self.documents:
            return 0
        return sum(d.num_chunks for d in self.documents if d.num_chunks)

    @property
    def topics(self) -> List[str]:
        import json
        all_topics: List[str] = []
        if self.documents:
            for doc in self.documents:
                if doc.extracted_topics:
                    try:
                        parsed = json.loads(doc.extracted_topics)
                        for t in parsed:
                            if t and t not in all_topics:
                                all_topics.append(t)
                    except Exception:
                        pass
        return all_topics

class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    title = Column(String(200), nullable=False)
    category = Column(String(100), default="Academic")
    target_date = Column(String(50), default="")
    progress = Column(Integer, default=0) # 0 to 100
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="goals")

class LearningActivity(Base):
    __tablename__ = "learning_activities"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    activity_type = Column(String(50), nullable=False) # quiz_completed, doubt_clarified, document_uploaded, study_plan_created
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column(Text, default="{}")

    student = relationship("Student", back_populates="activities")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    topic = Column(String(100), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    difficulty = Column(String(50), default="Intermediate")
    num_questions = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="quizzes")
    subject = relationship("Subject", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(255), nullable=False)
    option_b = Column(String(255), nullable=False)
    option_c = Column(String(255), nullable=False)
    option_d = Column(String(255), nullable=False)
    correct_option = Column(String(10), nullable=False) # "A", "B", "C", "D"
    explanation = Column(Text, default="")
    topic = Column(String(100), default="")

    quiz = relationship("Quiz", back_populates="questions")
    answers = relationship("QuizAnswer", back_populates="question")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=5)
    percentage = Column(Float, default=0.0)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    quiz = relationship("Quiz", back_populates="attempts")
    student = relationship("Student", back_populates="attempts")
    answers = relationship("QuizAnswer", back_populates="attempt", cascade="all, delete-orphan")

class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option = Column(String(10), nullable=False)
    is_correct = Column(Boolean, default=False)

    attempt = relationship("QuizAttempt", back_populates="answers")
    question = relationship("Question", back_populates="answers")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    file_type = Column(String(50), default="pdf")
    num_chunks = Column(Integer, default=0)
    status = Column(String(50), default="processed") # "processing", "processed", "failed", "empty"
    extracted_topics = Column(Text, default="[]")
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="documents")
    subject = relationship("Subject", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    @property
    def course_name(self) -> Optional[str]:
        return self.subject.name if self.subject else None

    @property
    def topics_list(self) -> List[str]:
        import json
        if not self.extracted_topics:
            return []
        try:
            return json.loads(self.extracted_topics)
        except Exception:
            return []

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("knowledge_documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    page_number = Column(Integer, default=1)

    document = relationship("KnowledgeDocument", back_populates="chunks")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    title = Column(String(200), default="Academic Discussion")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.timestamp")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender = Column(String(20), nullable=False) # "user", "assistant"
    content = Column(Text, nullable=False)
    agent_action = Column(Text, default="{}") # JSON metadata of agent decision & reasoning
    sources_json = Column(Text, default="[]") # JSON list of citations/passages retrieved
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    topic = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    reason = Column(Text, nullable=False)
    suggested_action = Column(String(200), nullable=False)
    priority = Column(String(20), default="Medium") # "High", "Medium", "Low"
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="recommendations")

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), default="General Curriculum")
    target_date = Column(String(50), default="")
    available_hours_per_week = Column(Integer, default=15)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="study_plans")
    tasks = relationship("StudyTask", back_populates="plan", cascade="all, delete-orphan", order_by="StudyTask.id")

class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("study_plans.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    topic = Column(String(100), nullable=False)
    task_description = Column(Text, nullable=False)
    day_of_week = Column(String(50), default="Day 1") # e.g. "Monday", "Day 1"
    estimated_minutes = Column(Integer, default=45)
    priority = Column(String(20), default="High") # "High", "Medium", "Low"
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    plan = relationship("StudyPlan", back_populates="tasks")

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    rating = Column(Integer, default=5)
    category = Column(String(100), default="General Experience")
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="feedbacks")
