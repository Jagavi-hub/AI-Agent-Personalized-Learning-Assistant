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
    credential: Optional[str] = Field(None, description="Google ID Token issued by Google Identity Services")
    id_token: Optional[str] = Field(None, description="Alias for credential field")

    @property
    def token(self) -> str:
        return (self.credential or self.id_token or "").strip()

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
    role: str = "student"
    is_admin: bool = False
    custom_quota_bytes: Optional[int] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: StudentOut
    is_onboarded: bool = False
    is_admin: bool = False

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

# ----------------- AI PDF Explainer Schemas -----------------
class PdfDocumentItem(BaseModel):
    id: int
    filename: str
    readable_title: str
    course_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_id: Optional[int] = None
    page_count: int
    file_size: int
    upload_date: datetime
    status: str
    num_chunks: int
    extracted_topics: List[str] = []

    class Config:
        from_attributes = True

class TopicOutlineItem(BaseModel):
    id: str
    title: str
    page_start: int
    page_end: int
    is_ai_derived: bool = False
    subtopics: List[str] = []
    chunk_count: int = 0

class PdfOutlineResponse(BaseModel):
    document_id: int
    filename: str
    readable_title: str
    course_name: Optional[str] = None
    total_pages: int
    topics: List[TopicOutlineItem]

class ExplainPdfRequest(BaseModel):
    mode: str = "complete" # "complete" or "topic"
    topic: Optional[str] = None
    force_regenerate: bool = False

class PdfCitation(BaseModel):
    page_number: int
    filename: str
    snippet: Optional[str] = None

class PdfExplanationResponse(BaseModel):
    document_id: int
    filename: str
    readable_title: str
    course_name: Optional[str] = None
    mode: str
    topic_title: Optional[str] = None
    content: str
    citations: List[PdfCitation] = []
    provider: str
    outline: Optional[List[TopicOutlineItem]] = []
    total_pages: Optional[int] = None
    created_at: Optional[datetime] = None
    is_cached: bool = False

class PdfAskRequest(BaseModel):
    question: str

class PdfAskResponse(BaseModel):
    document_id: int
    filename: str
    question: str
    answer: str
    citations: List[PdfCitation] = []
    provider: str

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
    subject: str = Field("Platform Feedback", min_length=3, max_length=200)
    category: str = Field("General Feedback", min_length=2, max_length=100)
    priority: Optional[str] = Field("Normal", description="Low, Normal, or High")
    related_course: Optional[str] = Field(None, max_length=100)
    rating: int = Field(5, ge=1, le=5)
    comment: str = Field(..., min_length=10, max_length=3000)

class FeedbackReplyCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=3000)

class FeedbackReplyOut(BaseModel):
    id: int
    feedback_id: int
    sender_id: int
    sender_role: str
    sender_name: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class FeedbackOut(BaseModel):
    id: int
    student_id: int
    subject: str = "Platform Feedback"
    category: str = "General Experience"
    priority: Optional[str] = "Normal"
    related_course: Optional[str] = None
    rating: int
    comment: str
    status: str = "open"
    created_at: datetime
    updated_at: Optional[datetime] = None
    replies_count: Optional[int] = 0
    latest_reply: Optional[str] = None

    class Config:
        from_attributes = True

class FeedbackThreadOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    subject: str
    category: str
    priority: Optional[str] = "Normal"
    related_course: Optional[str] = None
    rating: int
    comment: str
    message: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    replies: List[FeedbackReplyOut] = Field(default_factory=list)

    class Config:
        from_attributes = True

class FeedbackStatusUpdate(BaseModel):
    status: str # "open", "in_progress", "awaiting_student", "awaiting_admin", "resolved", "reopened"

# ----------------- Storage & User Management Schemas -----------------
class StorageFileItem(BaseModel):
    id: int
    filename: str
    file_path: Optional[str] = None
    file_size: int
    file_type: str
    upload_date: datetime
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    num_chunks: int = 0
    is_course_material: bool = False

class StudentStorageInfo(BaseModel):
    used_bytes: int
    quota_bytes: int
    used_percentage: float
    file_count: int
    warning_status: str # "normal", "warning", "exceeded"
    cleanup_deadline: Optional[datetime] = None
    days_left: Optional[int] = None
    files: List[StorageFileItem] = Field(default_factory=list)

class AdminUserListItem(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_admin: bool
    status: Optional[str] = "active"
    department: str
    year: Optional[str] = "3rd Year"
    current_skill_level: Optional[str] = "Intermediate"
    created_at: datetime
    last_login: Optional[datetime] = None
    used_storage_bytes: int
    storage_used_bytes: Optional[int] = None
    quota_bytes: int
    custom_quota_bytes: Optional[int] = None
    usage_percentage: float
    warning_status: str # "normal", "warning", "exceeded"
    document_count: int
    cleanup_deadline: Optional[datetime] = None

class AdminUserListResponse(BaseModel):
    total: int
    users: List[AdminUserListItem] = Field(default_factory=list)
    items: List[AdminUserListItem] = Field(default_factory=list)
    page: int
    page_size: int

class AdminQuotaUpdateRequest(BaseModel):
    quota_bytes: Optional[int] = Field(None, gt=0, description="New quota limit in bytes")
    custom_quota_mb: Optional[int] = Field(None, gt=0, description="New quota limit in MB")

class AdminDashboardUsersStats(BaseModel):
    total_registered: int
    active_last_7d: int
    active_last_30d: int

class AdminDashboardStorageStats(BaseModel):
    total_user_storage_bytes: int
    total_user_storage_formatted: str
    users_over_quota: int
    users_in_warning: int

class AdminDashboardFeedbackStats(BaseModel):
    open_feedback: int
    awaiting_admin: int
    average_rating: float

class AdminDashboardStats(BaseModel):
    users: AdminDashboardUsersStats
    storage: AdminDashboardStorageStats
    feedback: AdminDashboardFeedbackStats
    recent_events: List[Dict[str, Any]] = Field(default_factory=list)
    total_users: Optional[int] = None
    active_users_7d: Optional[int] = None
    active_users_30d: Optional[int] = None
    total_storage_bytes: Optional[int] = None
    users_over_quota: Optional[int] = None
    users_in_warning: Optional[int] = None
    pending_feedback_count: Optional[int] = None
    unread_admin_replies_count: Optional[int] = None

# ----------------- Storage Warnings & Cleanup Schemas -----------------
class StorageWarningOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    start_time: datetime
    deadline: datetime
    status: str
    reason: str
    current_usage_bytes: int
    quota_bytes: int
    reminders_sent_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class CleanupLogOut(BaseModel):
    id: int
    student_id: int
    student_email: Optional[str] = None
    trigger_type: str
    is_dry_run: bool
    status: str
    files_deleted_count: int
    bytes_reclaimed: int
    deleted_files_json: str
    error_message: Optional[str] = None
    executed_at: datetime

    class Config:
        from_attributes = True

class CleanupExecuteResponse(BaseModel):
    status: str
    is_dry_run: bool
    student_id: int
    files_evaluated: int
    files_deleted_count: int
    bytes_reclaimed: int
    remaining_usage_bytes: int
    quota_bytes: int
    deleted_files: List[Dict[str, Any]] = Field(default_factory=list)
    message: str
    # UI compatibility aliases
    files_candidate_count: Optional[int] = None
    bytes_reclaimable: Optional[int] = None
    candidate_files: Optional[List[Dict[str, Any]]] = None

# ----------------- Notification Schemas -----------------
class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str = "account_notice"
    title: str
    message: str
    link: str = ""
    is_read: bool
    created_at: datetime
    # Compatibility aliases
    student_id: Optional[int] = None
    notification_type: Optional[str] = None
    severity: Optional[str] = "info"
    action_url: Optional[str] = None

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationOut] = Field(default_factory=list)
    items: Optional[List[NotificationOut]] = None
    unread_count: int = 0

# ----------------- Audit Log Schemas -----------------
class AuditLogOut(BaseModel):
    id: int
    admin_id: Optional[int] = None
    admin_email: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    details_json: str
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class AuditLogListResponse(BaseModel):
    total: int
    logs: List[AuditLogOut]
    page: int
    page_size: int

# ----------------- Student Detail & Account Management Schemas -----------------
class StudentStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(active|suspended)$", description="Account status: active or suspended")
    reason: Optional[str] = "Administrative action"

class StudentDetailResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Optional[str] = "student"
    status: Optional[str] = "active"
    is_admin: bool = False
    department: Optional[str] = "General"
    year: Optional[str] = "3rd Year"
    semester: Optional[str] = "6th Semester"
    current_skill_level: Optional[str] = "Intermediate"
    preferred_learning_style: Optional[str] = None
    enrolled_subjects: List[str] = Field(default_factory=list)
    created_at: datetime
    last_login: Optional[datetime] = None
    storage: StudentStorageInfo
    storage_used_bytes: Optional[int] = None
    custom_quota_bytes: Optional[int] = None
    quiz_attempts_count: int = 0
    quiz_average_score: float = 0.0
    storage_warnings: List[StorageWarningOut] = Field(default_factory=list)
    recent_feedbacks: List[FeedbackThreadOut] = Field(default_factory=list)
    recent_notifications: List[NotificationOut] = Field(default_factory=list)
    courses: List[Dict[str, Any]] = Field(default_factory=list)
    documents: List[Dict[str, Any]] = Field(default_factory=list)
    quiz_attempts: List[Dict[str, Any]] = Field(default_factory=list)

# ----------------- Alerts & Announcements Schemas -----------------
class AlertBroadcastRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5)
    category: str = Field("announcement", description="info, announcement, storage_warning, maintenance, account_notice")
    target_scope: Optional[str] = Field(None, description="all, individual, selected")
    scope: Optional[str] = None
    student_ids: Optional[List[int]] = None
    target_user_ids: Optional[List[int]] = None
    link: Optional[str] = ""

class AlertBroadcastResponse(BaseModel):
    message: str
    recipients_count: int
    delivered_count: Optional[int] = None
    notification_id: Optional[int] = None
    notification_ids: Optional[List[int]] = None
    alert_title: str
    category: str
    created_at: datetime

# ----------------- System Health & Monitoring Schemas -----------------
class DatabaseHealthInfo(BaseModel):
    status: str
    connected: bool
    database_url_safe: str
    database_size_bytes: int
    database_size_formatted: str
    total_students: int
    total_documents: int
    total_quizzes: int
    total_audit_events: int

class StorageHealthInfo(BaseModel):
    status: str
    upload_dir: str
    total_uploads_bytes: int
    total_uploads_formatted: str
    total_uploaded_files: int
    disk_total_bytes: Optional[int] = None
    disk_free_bytes: Optional[int] = None
    disk_free_formatted: Optional[str] = None
    disk_used_bytes: Optional[int] = None
    disk_used_percent: Optional[float] = None

class AIProviderHealthInfo(BaseModel):
    status: str # "operational", "offline_fallback", "misconfigured"
    provider_name: str
    model: str
    api_key_configured: bool
    fallback_engine_ready: bool
    notes: str
    provider: Optional[str] = None

class BackgroundTasksHealthInfo(BaseModel):
    status: str
    cleanup_dry_run_mode: bool
    active_warnings_count: int
    pending_cleanup_count: int
    last_cleanup_timestamp: Optional[datetime] = None

class SystemHealthDetailsResponse(BaseModel):
    overall_status: str # "healthy", "degraded", "warning", "error"
    status: Optional[str] = None
    timestamp: datetime
    version: str
    backend_uptime: str
    database: DatabaseHealthInfo
    storage: StorageHealthInfo
    ai_provider: AIProviderHealthInfo
    ai: Optional[AIProviderHealthInfo] = None
    background_tasks: BackgroundTasksHealthInfo
    recent_error_events_count: int

# ----------------- Admin Settings Schemas -----------------
class AdminSettingsResponse(BaseModel):
    default_storage_quota_bytes: int
    default_storage_quota_mb: int
    default_quota_mb: Optional[int] = None
    max_storage_quota_bytes: int
    storage_warning_threshold: float
    warning_threshold_pct: Optional[int] = None
    cleanup_grace_period_days: int
    retention_days: Optional[int] = None
    cleanup_dry_run_enabled: bool
    dry_run_default: Optional[bool] = None
    admin_emails: List[str]
    cors_origins: List[str]
    access_token_expire_days: int
    max_upload_mb: Optional[int] = 25

class AdminSettingsUpdateRequest(BaseModel):
    default_storage_quota_mb: Optional[int] = Field(None, ge=10, le=10240, description="Default storage quota in MB")
    default_quota_mb: Optional[int] = None
    storage_warning_threshold: Optional[float] = Field(None, ge=0.5, le=0.99, description="Storage warning trigger ratio")
    warning_threshold_pct: Optional[int] = None
    cleanup_grace_period_days: Optional[int] = Field(None, ge=1, le=180, description="Grace period before retention cleanup")
    retention_days: Optional[int] = None
    cleanup_dry_run_enabled: Optional[bool] = None
    dry_run_default: Optional[bool] = None
    max_upload_mb: Optional[int] = None

# ----------------- Student Portal Settings Schemas -----------------
class LearningPreferences(BaseModel):
    preferred_learning_style: str = "Visual"
    explanation_level: str = "Detailed" # "Simple", "Intermediate", "Detailed"
    preferred_answer_format: str = "Step-by-step" # "Step-by-step", "Examples", "Summary", "Detailed Explanation"
    preferred_language: str = "English"
    study_pace: str = "Moderate" # "Slow", "Moderate", "Fast"

class AITutorPreferences(BaseModel):
    voice_enabled: bool = False
    explanation_verbosity: str = "Detailed" # "Concise", "Detailed"
    include_examples: bool = True
    show_pdf_citations: bool = True
    enable_followup_suggestions: bool = True

class QuizPreferences(BaseModel):
    default_num_questions: int = 5
    preferred_difficulty: str = "Medium" # "Easy", "Medium", "Hard"
    preferred_question_type: str = "MCQ" # "MCQ", "True/False", "Short Answer"
    show_explanations: bool = True
    enable_timer: bool = False

class NotificationPreferences(BaseModel):
    learning_reminders: bool = True
    study_goal_reminders: bool = True
    quiz_results: bool = True
    learning_recommendations: bool = True
    feedback_replies: bool = True
    platform_announcements: bool = True

class AccessibilityPreferences(BaseModel):
    font_size: str = "Medium" # "Small", "Medium", "Large"
    reduced_motion: bool = False
    high_contrast_focus: bool = True

class StudentSettingsResponse(BaseModel):
    learning_preferences: LearningPreferences
    ai_tutor_preferences: AITutorPreferences
    quiz_preferences: QuizPreferences
    notifications: NotificationPreferences
    accessibility: AccessibilityPreferences
    auth_provider: str = "local"
    google_connected: bool = False
    google_email: Optional[str] = None
    email: str
    name: str

class StudentSettingsUpdateRequest(BaseModel):
    learning_preferences: Optional[Dict[str, Any]] = None
    ai_tutor_preferences: Optional[Dict[str, Any]] = None
    quiz_preferences: Optional[Dict[str, Any]] = None
    notifications: Optional[Dict[str, Any]] = None
    accessibility: Optional[Dict[str, Any]] = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=100)
    confirm_new_password: str = Field(..., min_length=6, max_length=100)

class AccountDeletionRequest(BaseModel):
    reason: Optional[str] = ""
    confirm_phrase: str = Field(..., description="Confirmation phrase 'DELETE MY ACCOUNT'")

