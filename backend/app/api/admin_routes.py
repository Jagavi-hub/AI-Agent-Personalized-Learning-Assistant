import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc

from app.core.database import get_db
from app.core.config import settings
from app.api.routes import get_current_user
from app.models.entities import (
    Student, KnowledgeDocument, Feedback, FeedbackReply,
    StorageWarning, StorageCleanupLog, Notification, AuditLog
)
from app.schemas.schemas import (
    AdminDashboardStats, AdminUserListItem, AdminUserListResponse,
    AdminQuotaUpdateRequest, StudentStorageInfo, StorageWarningOut,
    CleanupLogOut, CleanupExecuteResponse, FeedbackThreadOut,
    FeedbackReplyCreate, FeedbackReplyOut, FeedbackStatusUpdate,
    AuditLogOut, AuditLogListResponse, StudentDetailResponse,
    StudentStatusUpdateRequest, AlertBroadcastRequest, AlertBroadcastResponse,
    SystemHealthDetailsResponse, AdminSettingsResponse, AdminSettingsUpdateRequest,
    NotificationOut
)
from app.services.admin_service import admin_service

admin_router = APIRouter(prefix="/admin", tags=["Admin Console"])

def require_admin(
    current_user: Student = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Student:
    """
    Authoritative Server-Side Authorization Dependency.
    Never trusts client input. Validates student email and role against server settings.
    """
    if not current_user.is_admin_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Access restricted to authorized LearnAI administrators."
        )
    return current_user

# ----------------- Dashboard & Overview -----------------

@admin_router.get("/dashboard/stats", response_model=AdminDashboardStats)
def get_dashboard_stats(
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns authentic aggregated system statistics and recent administrative events."""
    metrics = admin_service.get_dashboard_metrics(db)
    return metrics

# ----------------- User & Storage Management -----------------

@admin_router.get("/users", response_model=AdminUserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    warning_filter: Optional[str] = Query(None), # "all", "warning", "exceeded", "normal"
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Lists registered users with their real disk storage usage, quotas,
    warning status, and cleanup deadlines.
    """
    query = db.query(Student)

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.filter(or_(
            func.lower(Student.name).like(s),
            func.lower(Student.email).like(s),
            func.lower(Student.department).like(s)
        ))

    all_matched = query.order_by(Student.created_at.desc()).all()

    user_items: List[AdminUserListItem] = []
    for st in all_matched:
        storage = admin_service.get_user_storage_breakdown(db, st.id)
        w_status = storage["warning_status"]

        if warning_filter and warning_filter != "all" and w_status != warning_filter:
            continue

        doc_count = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.student_id == st.id,
            KnowledgeDocument.is_course_material == False
        ).count()

        user_items.append(AdminUserListItem(
            id=st.id,
            name=st.name,
            email=st.email,
            role=st.role or ("admin" if st.is_admin_user else "student"),
            is_admin=st.is_admin_user,
            status=getattr(st, "status", "active") or "active",
            department=st.department or "General",
            year=getattr(st, "year", "3rd Year") or "3rd Year",
            current_skill_level=getattr(st, "current_skill_level", "Intermediate") or "Intermediate",
            created_at=st.created_at or datetime.utcnow(),
            last_login=st.last_login,
            used_storage_bytes=storage["used_bytes"],
            storage_used_bytes=storage["used_bytes"],
            quota_bytes=storage["quota_bytes"],
            custom_quota_bytes=st.custom_quota_bytes or storage["quota_bytes"],
            usage_percentage=storage["used_percentage"],
            warning_status=w_status,
            document_count=doc_count,
            cleanup_deadline=storage["cleanup_deadline"]
        ))

    # Paginate in-memory
    total = len(user_items)
    start_idx = (page - 1) * page_size
    paged = user_items[start_idx : start_idx + page_size]

    return AdminUserListResponse(
        total=total,
        users=paged,
        items=paged,
        page=page,
        page_size=page_size
    )

@admin_router.get("/users/{user_id}/storage", response_model=StudentStorageInfo)
def get_user_storage(
    user_id: int,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns detailed storage breakdown and owned file list for a specific student."""
    st = db.query(Student).filter(Student.id == user_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student account not found.")

    breakdown = admin_service.get_user_storage_breakdown(db, user_id)
    return breakdown

@admin_router.put("/users/{user_id}/quota")
def update_user_quota(
    user_id: int,
    req: AdminQuotaUpdateRequest,
    request: Request,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Updates the custom storage quota for a specific user.
    Validates positive bounds within safety limits and records an audit log.
    """
    quota_bytes = req.quota_bytes
    if quota_bytes is None and req.custom_quota_mb is not None:
        quota_bytes = int(req.custom_quota_mb * 1024 * 1024)

    if not quota_bytes or quota_bytes <= 0:
        raise HTTPException(status_code=400, detail="Storage quota must be a positive number of bytes.")
    if quota_bytes > settings.MAX_STORAGE_QUOTA_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Quota exceeds the maximum safety limit of {admin_service.format_bytes(settings.MAX_STORAGE_QUOTA_BYTES)}."
        )

    st = db.query(Student).filter(Student.id == user_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student account not found.")

    old_quota = st.custom_quota_bytes or settings.DEFAULT_STORAGE_QUOTA_BYTES
    st.custom_quota_bytes = quota_bytes
    db.commit()

    # Re-evaluate storage breakdown with new quota
    breakdown = admin_service.get_user_storage_breakdown(db, user_id)

    # Log audit event
    admin_service.log_audit_event(
        db=db,
        admin_email=admin.email,
        action="quota_updated",
        target_type="user",
        target_id=str(user_id),
        details={
            "student_name": st.name,
            "student_email": st.email,
            "old_quota_bytes": old_quota,
            "new_quota_bytes": quota_bytes,
            "new_quota_human": admin_service.format_bytes(quota_bytes),
            "new_usage_percentage": breakdown["used_percentage"]
        },
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None
    )

    # In-app notification to student
    admin_service.create_notification(
        db=db,
        user_id=user_id,
        notif_type="account_notice",
        title="Storage Quota Updated",
        message=f"Your LearnAI storage quota has been adjusted to {admin_service.format_bytes(quota_bytes)} by an administrator.",
        link="/knowledge-base"
    )

    return {
        "message": f"Storage quota successfully updated to {admin_service.format_bytes(quota_bytes)}.",
        "quota_bytes": quota_bytes,
        "storage": breakdown
    }

# ----------------- Storage Warnings & 30-Day Cleanup -----------------

@admin_router.get("/storage/warnings", response_model=List[StorageWarningOut])
def list_storage_warnings(
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lists all active and past storage warning records with cleanup deadlines."""
    warnings = db.query(StorageWarning).order_by(StorageWarning.start_time.desc()).all()
    out = []
    for w in warnings:
        st = w.student
        out.append(StorageWarningOut(
            id=w.id,
            student_id=w.student_id,
            student_name=st.name if st else "Unknown",
            student_email=st.email if st else "unknown",
            start_time=w.start_time,
            deadline=w.deadline,
            status=w.status,
            reason=w.reason,
            current_usage_bytes=w.current_usage_bytes,
            quota_bytes=w.quota_bytes,
            reminders_sent_count=w.reminders_sent_count,
            created_at=w.created_at
        ))
    return out

@admin_router.get("/storage/cleanup/dry-run/{student_id}", response_model=CleanupExecuteResponse)
@admin_router.post("/storage/cleanup/dry-run/{student_id}", response_model=CleanupExecuteResponse)
def dry_run_cleanup(
    student_id: int,
    grace_days: Optional[int] = Query(None),
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Simulates storage cleanup without modifying database or deleting files.
    Allows inspection of deterministic oldest-first deletion strategy.
    """
    res = admin_service.execute_storage_cleanup(
        db=db,
        student_id=student_id,
        is_dry_run=True,
        admin_id=admin.id,
        admin_email=admin.email
    )
    res["files_candidate_count"] = res.get("files_deleted_count", 0)
    res["bytes_reclaimable"] = res.get("bytes_reclaimed", 0)
    res["candidate_files"] = res.get("deleted_files", [])
    return res

@admin_router.post("/storage/cleanup/execute/{student_id}", response_model=CleanupExecuteResponse)
def execute_cleanup(
    student_id: int,
    grace_days: Optional[int] = Query(None),
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Executes actual deterministic storage cleanup for an over-quota student.
    Permanently deletes eligible oldest uploads until within quota.
    """
    res = admin_service.execute_storage_cleanup(
        db=db,
        student_id=student_id,
        is_dry_run=False,
        admin_id=admin.id,
        admin_email=admin.email
    )
    res["files_candidate_count"] = res.get("files_deleted_count", 0)
    res["bytes_reclaimable"] = res.get("bytes_reclaimed", 0)
    res["candidate_files"] = res.get("deleted_files", [])
    return res

@admin_router.get("/storage/cleanup/logs", response_model=List[CleanupLogOut])
def list_cleanup_logs(
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns historical records of executed and simulated cleanups."""
    logs = db.query(StorageCleanupLog).order_by(StorageCleanupLog.executed_at.desc()).limit(50).all()
    out = []
    for lg in logs:
        st = lg.student
        out.append(CleanupLogOut(
            id=lg.id,
            student_id=lg.student_id,
            student_email=st.email if st else None,
            trigger_type=lg.trigger_type,
            is_dry_run=lg.is_dry_run,
            status=lg.status,
            files_deleted_count=lg.files_deleted_count,
            bytes_reclaimed=lg.bytes_reclaimed,
            deleted_files_json=lg.deleted_files_json,
            error_message=lg.error_message,
            executed_at=lg.executed_at
        ))
    return out

# ----------------- Feedback Center & Two-Way Replies -----------------

@admin_router.get("/feedback", response_model=List[FeedbackThreadOut])
def list_all_feedback(
    status_filter: Optional[str] = Query(None), # "open", "awaiting_student", "resolved", "reopened"
    category_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lists feedback submitted across all students with reply history and filter controls."""
    query = db.query(Feedback)

    if status_filter and status_filter != "all":
        query = query.filter(Feedback.status == status_filter)

    if category_filter and category_filter != "all":
        query = query.filter(Feedback.category == category_filter)

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.join(Student).filter(or_(
            func.lower(Feedback.comment).like(s),
            func.lower(Feedback.subject).like(s),
            func.lower(Student.name).like(s),
            func.lower(Student.email).like(s)
        ))

    threads = query.order_by(Feedback.created_at.desc()).all()

    out: List[FeedbackThreadOut] = []
    for fb in threads:
        st = fb.student
        replies_out = [
            FeedbackReplyOut(
                id=r.id,
                feedback_id=r.feedback_id,
                sender_id=r.sender_id,
                sender_role=r.sender_role,
                sender_name=r.sender_name,
                message=r.message,
                created_at=r.created_at
            )
            for r in fb.replies
        ]
        out.append(FeedbackThreadOut(
            id=fb.id,
            student_id=fb.student_id,
            student_name=st.name if st else "Anonymous",
            student_email=st.email if st else "unknown",
            subject=fb.subject or "Platform Feedback",
            category=fb.category or "General Experience",
            priority=getattr(fb, "priority", "Normal") or "Normal",
            related_course=getattr(fb, "related_course", None),
            rating=fb.rating or 5,
            comment=fb.comment or "",
            message=fb.comment or "",
            status=fb.status or "open",
            created_at=fb.created_at,
            updated_at=fb.updated_at,
            replies=replies_out
        ))

    return out

@admin_router.get("/feedback/{feedback_id}", response_model=FeedbackThreadOut)
def get_feedback_thread(
    feedback_id: int,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Retrieves full conversation details for a feedback thread."""
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback thread not found.")

    st = fb.student
    replies_out = [
        FeedbackReplyOut(
            id=r.id,
            feedback_id=r.feedback_id,
            sender_id=r.sender_id,
            sender_role=r.sender_role,
            sender_name=r.sender_name,
            message=r.message,
            created_at=r.created_at
        )
        for r in fb.replies
    ]

    return FeedbackThreadOut(
        id=fb.id,
        student_id=fb.student_id,
        student_name=st.name if st else "Anonymous",
        student_email=st.email if st else "unknown",
        subject=fb.subject or "Platform Feedback",
        category=fb.category or "General Experience",
        priority=getattr(fb, "priority", "Normal") or "Normal",
        related_course=getattr(fb, "related_course", None),
        rating=fb.rating or 5,
        comment=fb.comment or "",
        message=fb.comment or "",
        status=fb.status or "open",
        created_at=fb.created_at,
        updated_at=fb.updated_at,
        replies=replies_out
    )

@admin_router.post("/feedback/{feedback_id}/reply", response_model=FeedbackReplyOut)
def reply_to_feedback(
    feedback_id: int,
    req: FeedbackReplyCreate,
    request: Request,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin replies to student feedback.
    Updates thread status to 'awaiting_student', sends in-app notification to student,
    and logs audit entry.
    """
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback thread not found.")

    reply = FeedbackReply(
        feedback_id=feedback_id,
        sender_id=admin.id,
        sender_role="admin",
        sender_name=f"Admin ({admin.name})",
        message=req.message.strip(),
        created_at=datetime.utcnow()
    )
    db.add(reply)

    fb.status = "awaiting_student"
    fb.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(reply)

    # In-app notification to student (navigates safely to /feedback on student portal)
    admin_service.create_notification(
        db=db,
        user_id=fb.student_id,
        notif_type="feedback_reply",
        title="Admin Responded to Your Feedback",
        message=f"Administrator responded: \"{req.message.strip()[:80]}...\"",
        link="/feedback"
    )

    # Audit log
    admin_service.log_audit_event(
        db=db,
        admin_email=admin.email,
        action="feedback_reply",
        target_type="feedback",
        target_id=str(feedback_id),
        details={
            "student_id": fb.student_id,
            "snippet": req.message.strip()[:100]
        },
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None
    )

    return FeedbackReplyOut(
        id=reply.id,
        feedback_id=reply.feedback_id,
        sender_id=reply.sender_id,
        sender_role=reply.sender_role,
        sender_name=reply.sender_name,
        message=reply.message,
        created_at=reply.created_at
    )

@admin_router.patch("/feedback/{feedback_id}/status")
def update_feedback_status(
    feedback_id: int,
    req: FeedbackStatusUpdate,
    request: Request,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Updates the status of a feedback thread (e.g. open -> resolved, in_progress, reopened)."""
    valid_statuses = {"open", "in_progress", "awaiting_student", "awaiting_admin", "resolved", "reopened"}
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback thread not found.")

    old_status = fb.status
    fb.status = req.status
    fb.updated_at = datetime.utcnow()
    db.commit()

    status_label = req.status.replace("_", " ").title()
    admin_service.create_notification(
        db=db,
        user_id=fb.student_id,
        notif_type="feedback_status",
        title=f"Feedback Ticket Updated: {status_label}",
        message=f"Administrator updated ticket #{fb.id} ('{(fb.subject or '')[:40]}...') status to {status_label}.",
        severity="success" if req.status == "resolved" else "info",
        link="/feedback"
    )

    admin_service.log_audit_event(
        db=db,
        admin_email=admin.email,
        action="feedback_status_changed",
        target_type="feedback",
        target_id=str(feedback_id),
        details={"old_status": old_status, "new_status": req.status},
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None
    )

    return {"message": f"Feedback status changed to {req.status}", "status": req.status}

# ----------------- Audit Log Inspection -----------------

@admin_router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    action: Optional[str] = Query(None),
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns paginated, chronological administrative audit trail."""
    query = db.query(AuditLog)

    if action and action != "all":
        query = query.filter(AuditLog.action == action)

    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset((page - 1) * page_size).limit(page_size).all()

    out_logs = [
        AuditLogOut(
            id=lg.id,
            admin_id=lg.admin_id,
            admin_email=lg.admin_email,
            action=lg.action,
            target_type=lg.target_type,
            target_id=lg.target_id,
            details_json=lg.details_json,
            ip_address=lg.ip_address,
            timestamp=lg.timestamp
        )
        for lg in logs
    ]

    return AuditLogListResponse(
        total=total,
        logs=out_logs,
        page=page,
        page_size=page_size
    )

# ----------------- Student Detail & Account Actions -----------------

@admin_router.get("/users/{user_id}", response_model=StudentDetailResponse)
def get_student_detail(
    user_id: int,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns detailed academic profile, quiz history, storage breakdown, warnings, and feedback for a student."""
    detail = admin_service.get_student_detail(db, user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Student account not found.")
    return detail

@admin_router.patch("/users/{user_id}/status")
def update_student_status(
    user_id: int,
    req: StudentStatusUpdateRequest,
    request: Request,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Suspends or reactivates a student account. Prevents self-suspension."""
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Administrators cannot suspend their own account.")

    st = db.query(Student).filter(Student.id == user_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student account not found.")

    old_status = getattr(st, "status", "active") or "active"
    st.status = req.status
    db.commit()

    admin_service.log_audit_event(
        db=db,
        actor=admin,
        action="user_status_updated",
        target_type="user",
        target_id=str(user_id),
        details={
            "student_email": st.email,
            "old_status": old_status,
            "new_status": req.status,
            "reason": req.reason
        },
        ip_address=request.client.host if request.client else None
    )

    if req.status == "suspended":
        admin_service.create_notification(
            db=db,
            user_id=user_id,
            notif_type="account_notice",
            title="Account Suspended",
            message=f"Your LearnAI account has been suspended by an administrator. Reason: {req.reason or 'Administrative review'}.",
            link="/settings"
        )
    else:
        admin_service.create_notification(
            db=db,
            user_id=user_id,
            notif_type="account_notice",
            title="Account Reactivated",
            message="Your LearnAI student account has been reactivated. You have full access to courses and quizzes.",
            link="/dashboard"
        )

    return {"message": f"Student account status updated to '{req.status}'.", "status": req.status}

@admin_router.delete("/users/{user_id}")
def delete_student_account(
    user_id: int,
    request: Request,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Permanently and safely deletes a student account with strict safeguards:
    - Never delete own admin account
    - Never delete admin account
    - Safely preserves institutional course materials
    - Cleans up personal uploads and clears dangling foreign key references
    """
    if admin.id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Forbidden: Administrators cannot delete their own active account."
        )

    st = db.query(Student).filter(Student.id == user_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Student account not found.")

    if st.is_admin_user:
        raise HTTPException(
            status_code=400,
            detail="Forbidden: Cannot delete an administrator account."
        )

    result = admin_service.delete_student_account(
        db=db,
        admin=admin,
        student=st,
        ip_address=request.client.host if request.client else None
    )
    return result

# ----------------- Alerts & Announcements -----------------

@admin_router.post("/alerts/broadcast", response_model=AlertBroadcastResponse)
def broadcast_alert(
    req: AlertBroadcastRequest,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Composes and delivers individual or broadcast announcements to student notification centers."""
    target_scope = req.target_scope or req.scope or "all"
    student_ids = req.student_ids or req.target_user_ids or []
    res = admin_service.broadcast_alert(
        db=db,
        admin=admin,
        title=req.title.strip(),
        message=req.message.strip(),
        category=req.category,
        target_scope=target_scope,
        student_ids=student_ids,
        link=req.link or ""
    )
    return res

@admin_router.get("/alerts/history", response_model=List[NotificationOut])
def get_alerts_history(
    limit: int = Query(30, ge=1, le=100),
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns recent notifications and announcements delivered across the system."""
    notifs = db.query(Notification).order_by(Notification.created_at.desc()).limit(limit).all()
    return notifs

# ----------------- System Health & Monitoring -----------------

@admin_router.get("/system/health", response_model=SystemHealthDetailsResponse)
def get_system_health(
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns authentic, measured operational health metrics for database, storage, AI, and worker."""
    health_data = admin_service.get_system_health(db)
    return health_data

# ----------------- Admin Settings -----------------

@admin_router.get("/settings", response_model=AdminSettingsResponse)
def get_admin_settings(
    admin: Student = Depends(require_admin)
):
    """Returns active platform administrative settings."""
    return admin_service.get_admin_settings()

@admin_router.put("/settings", response_model=AdminSettingsResponse)
def update_admin_settings(
    req: AdminSettingsUpdateRequest,
    admin: Student = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Updates operational settings and records audit log."""
    updates = req.dict(exclude_unset=True)
    res = admin_service.update_admin_settings(db, admin, updates)
    return res

