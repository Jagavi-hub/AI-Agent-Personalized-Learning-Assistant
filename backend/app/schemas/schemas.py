from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime

# ----------------- Authentication Schemas -----------------
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, example="Jagavi Raju")
    email: EmailStr = Field(..., example="jagavi.raju@university.edu")
    password: str = Field(..., min_length=6, example="LearnAI2026Secure")
    department: str = Field("Computer Science & Engineering")
    year: str = Field("3rd Year")
    semester: str = Field("6th Semester")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="jagavi.raju@university.edu")
    password: str = Field(..., example="LearnAI2026Secure")

class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., description="Google ID Token issued by Google Identity Services")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

# ----------------- Student Schemas -----------------
class StudentBase(BaseModel):
    name: str = Field(..., example="Jagavi Raju")
    email: EmailStr = Field(..., example="jagavi.raju@university.edu")
    department: str = Field("Computer Science & Engineering")
    year: str = Field("3rd Year")
    semester: str = Field("6th Semester")
    enrolled_subjects: List[str] = Field(default_factory=list)
    learning_goals: List[str] = Field(default_factory=list)
    preferred_learning_style: str = Field("Visual & Practical")
    areas_of_interest: List[str] = Field(default_factory=list)
    current_skill_level: str = Field("Intermediate")

class StudentCreate(StudentBase):
    password: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    year: Optional[str] = None
    semester: Optional[str] = None
    enrolled_subjects: Optional[List[str]] = None
    learning_goals: Optional[List[str]] = None
    preferred_learning_style: Optional[str] = None
    areas_of_interest: Optional[List[str]] = None
    current_skill_level: Optional[str] = None

class OnboardingRequest(BaseModel):
    department: str
    year: str
    semester: str
    enrolled_subjects: List[str] = Field(default_factory=list)
    learning_goals: List[str] = Field(default_factory=list)
    preferred_learning_style: str = "Visual & Practical"
    areas_of_interest: List[str] = Field(default_factory=list)
    current_skill_level: str = "Intermediate"

class StudentOut(StudentBase):
    id: int
    auth_provider: str = "local"
    is_onboarded: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: StudentOut
    is_onboarded: bool = False

# ----------------- Subject Schemas -----------------
class AssociatedDocumentOut(BaseModel):
    id: int
    filename: str
    file_size: Optional[int] = 0
    file_type: Optional[str] = "pdf"
    num_chunks: Optional[int] = 0
    status: Optional[str] = "processed"
    upload_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class SubjectOut(BaseModel):
    id: int
    code: str
    name: str
    department: str
    semester: str
    description: str
    credits: int
    document_filename: Optional[str] = None
    document_filenames: Optional[List[str]] = []
    document_id: Optional[int] = None
    status: Optional[str] = "processed"
    num_chunks: Optional[int] = 0
    topics: Optional[List[str]] = []
    documents: Optional[List[AssociatedDocumentOut]] = []

    class Config:
        from_attributes = True

# ----------------- Learning Goal Schemas -----------------
class GoalCreate(BaseModel):
    title: str
    category: str = "Academic"
    target_date: str = ""
    progress: int = 0

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    progress: Optional[int] = None
    is_completed: Optional[bool] = None

class GoalOut(BaseModel):
    id: int
    student_id: int
    title: str
    category: str
    target_date: str
    progress: int
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Learning Activity Schemas -----------------
class ActivityOut(BaseModel):
    id: int
    student_id: int
    activity_type: str
    title: str
    description: str
    timestamp: datetime
    metadata_json: Optional[str] = "{}"

    class Config:
        from_attributes = True

# ----------------- Quiz Schemas -----------------
class QuestionOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    explanation: Optional[str] = ""
    topic: Optional[str] = ""

class QuizGenerateRequest(BaseModel):
    topic: Optional[str] = Field("Machine Learning", example="Machine Learning")
    subject_id: Optional[int] = None
    document_id: Optional[int] = None
    difficulty: str = Field("Intermediate", example="Intermediate")
    num_questions: int = Field(5, ge=1, le=10)

class QuizOut(BaseModel):
    id: int
    topic: str
    difficulty: str
    num_questions: int
    questions: List[QuestionOut]
    created_at: datetime

    class Config:
        from_attributes = True

class QuizAnswerSubmit(BaseModel):
    question_id: int
    selected_option: str # "A", "B", "C", "D"

class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: List[QuizAnswerSubmit]

class QuestionReviewResult(BaseModel):
    question_id: int
    question_text: str
    selected_option: str
    correct_option: str
    is_correct: bool
    explanation: str
    topic: str

class QuizSubmitResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    score: int
    total_questions: int
    percentage: float
    weak_topics: List[str]
    strong_topics: List[str]
    results: List[QuestionReviewResult]
    recommendations_generated: int
    adaptive_guidance: Optional[str] = None

class QuizAttemptOut(BaseModel):
    id: int
    quiz_id: int
    score: int
    total_questions: int
    percentage: float
    completed_at: datetime
    topic: Optional[str] = ""

    class Config:
        from_attributes = True

class MistakeInputItem(BaseModel):
    question_id: int
    question_text: str
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    selected_option: str
    correct_option: str
    explanation: Optional[str] = None
    topic: Optional[str] = None

class QuizMistakeExplanationRequest(BaseModel):
    quiz_id: Optional[int] = None
    attempt_id: Optional[int] = None
    subject_id: Optional[int] = None
    mistakes: Optional[List[MistakeInputItem]] = None

class QuestionExplanationOut(BaseModel):
    question_id: int
    question_text: str
    selected_option: str
    selected_option_text: Optional[str] = ""
    correct_option: str
    correct_option_text: Optional[str] = ""
    why_incorrect: str
    correct_concept: str
    step_by_step_explanation: str
    example_or_analogy: str
    tip_to_remember: str
    citation: Optional[str] = None
    topic: Optional[str] = None
    recommended_topic: Optional[str] = None

class QuizMistakeExplanationResponse(BaseModel):
    quiz_id: Optional[int] = None
    attempt_id: Optional[int] = None
    score: int
    total_questions: int
    percentage: float
    has_mistakes: bool
    summary_message: str
    explanations: List[QuestionExplanationOut]
    recommended_revision_topics: List[str]
    provider: str

# ----------------- Knowledge Base Schemas -----------------
class DocumentOut(BaseModel):
    id: int
    filename: str
    file_size: int
    file_type: str
    num_chunks: int
    status: str
    upload_date: datetime
    subject_id: Optional[int] = None
    course_name: Optional[str] = None
    extracted_topics: Optional[List[str]] = []

    @field_validator("extracted_topics", mode="before")
    @classmethod
    def parse_extracted_topics(cls, v):
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except Exception:
                return []
        return v or []

    class Config:
        from_attributes = True

class DocumentSearchResult(BaseModel):
    document_id: int
    filename: str
    page_number: int
    text: str
    score: float

class KnowledgeSearchRequest(BaseModel):
    query: str
    subject_id: Optional[int] = None
    top_k: int = 3

# ----------------- AI Agent Activity Panel & Chat Schemas -----------------
class AgentDecision(BaseModel):
    action_type: str  # explain_concept, simplify_concept, generate_quiz, revise_weak_topic, create_study_plan, notes_qa, recommend_resources
    intent: str
    rationale: str
    tool_executed: str
    provider: Optional[str] = "Academic AI Engine"
    is_fallback: Optional[bool] = False
    learner_context_used: Dict[str, Any]
    retrieved_sources: Optional[List[Dict[str, Any]]] = []
    recommended_next_step: Optional[str] = "Complete practice quiz to verify retention"
    response_time_ms: Optional[float] = 0.0
    # Enhanced transparent decision & reasoning metadata
    detected_intent: Optional[str] = None
    action_reason: Optional[str] = None
    selected_action: Optional[str] = None
    relevant_student_context: Optional[Dict[str, Any]] = None
    service_routing: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    action_override: Optional[str] = None
    subject_id: Optional[int] = None
    subject_code: Optional[str] = None

class SourceCitation(BaseModel):
    document_id: int
    filename: str
    page_number: int
    excerpt: str

class ChatMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender: str
    content: str
    agent_action: Optional[Dict[str, Any]] = None
    sources: Optional[List[SourceCitation]] = None
    timestamp: datetime

class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    conversation_id: int
    message_id: int
    content: str
    agent_decision: AgentDecision
    sources: List[SourceCitation] = []
    suggested_followups: List[str] = []

# ----------------- Recommendation Schemas -----------------
class RecommendationOut(BaseModel):
    id: int
    topic: str
    title: str
    reason: str
    suggested_action: str
    priority: str
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RecommendationUpdate(BaseModel):
    is_completed: bool

# ----------------- Study Planner Schemas (Module 8) -----------------
class StudyTaskOut(BaseModel):
    id: int
    plan_id: int
    topic: str
    task_description: str
    day_of_week: str
    estimated_minutes: int
    priority: str
    is_completed: bool
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StudyPlanOut(BaseModel):
    id: int
    student_id: int
    title: str
    subject: str
    target_date: str
    available_hours_per_week: int
    is_active: bool
    created_at: datetime
    tasks: List[StudyTaskOut] = []

    class Config:
        from_attributes = True

class StudyPlanGenerateRequest(BaseModel):
    title: str = Field("7-Day Mastery Plan", example="Final Exam Sprint")
    subject: str = Field("Deep Learning & Neural Networks", example="Deep Learning & Neural Networks")
    target_date: str = Field("Oct 25, 2026", example="Oct 25, 2026")
    available_hours_per_week: int = Field(15, ge=2, le=50)
    focus_weak_topics: bool = True

class StudyTaskCreate(BaseModel):
    plan_id: int
    topic: str
    task_description: str
    day_of_week: str = "Day 1"
    estimated_minutes: int = 45
    priority: str = "High"

class StudyTaskUpdate(BaseModel):
    is_completed: Optional[bool] = None
    task_description: Optional[str] = None
    estimated_minutes: Optional[int] = None
    priority: Optional[str] = None

# ----------------- Analytics & Dashboard Schemas -----------------
class TopicPerformance(BaseModel):
    topic: str
    total_questions: int
    correct_questions: int
    mastery_percentage: float
    status: str # "Strong", "Moderate", "Weak"

class SubjectPerformance(BaseModel):
    subject_name: str
    subject_code: str
    score: float
    quizzes_count: int

class ProgressAnalyticsOut(BaseModel):
    total_quizzes_taken: int
    average_score_percentage: float
    topics_mastered_count: int
    weak_topics_count: int
    strong_topics: List[TopicPerformance]
    weak_topics: List[TopicPerformance]
    all_topic_performance: List[TopicPerformance]
    quiz_trend: List[Dict[str, Any]]
    subject_performance: List[SubjectPerformance]
    recent_activities: List[ActivityOut]
    study_goals_completed: int
    total_study_goals: int
    study_tasks_completed: int = 0
    total_study_tasks: int = 0

# ----------------- Feedback Schemas -----------------
class FeedbackCreate(BaseModel):
    rating: int = Field(5, ge=1, le=5)
    category: str = "General Experience"
    comment: str = ""

class FeedbackOut(BaseModel):
    id: int
    student_id: int
    rating: int
    category: str
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True
