import os
import json
import shutil
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.config import settings
from app.models.entities import (
    Student, KnowledgeDocument, DocumentChunk, LearningActivity,
    QuizAttempt, ChatMessage, Feedback, FeedbackReply,
    StorageWarning, StorageCleanupLog, Notification, AuditLog,
    Subject
)

class AdminService:
    """
    Centralized service for Admin Authorization, User Storage Management,
    30-Day Retention Grace Period, In-App Notifications, Feedback Center, and Audit Logging.
    """

    # ----------------- Storage Management -----------------

    def get_user_storage_breakdown(self, db: Session, student_id: Any) -> Dict[str, Any]:
        """
        Calculates exact disk storage consumed by user-owned uploads.
        Excludes institutional course materials and temporary files.
        Deduplicates by physical canonical path and reconciles with disk size.
        """
        if hasattr(student_id, "id"):
            student_id = student_id.id

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {
                "used_bytes": 0,
                "quota_bytes": settings.DEFAULT_STORAGE_QUOTA_BYTES,
                "used_percentage": 0.0,
                "file_count": 0,
                "warning_status": "normal",
                "cleanup_deadline": None,
                "days_left": None,
                "files": []
            }

        quota = student.custom_quota_bytes if student.custom_quota_bytes and student.custom_quota_bytes > 0 else settings.DEFAULT_STORAGE_QUOTA_BYTES

        # Query user-owned documents
        docs = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.student_id == student_id,
            KnowledgeDocument.is_course_material == False
        ).order_by(KnowledgeDocument.upload_date.desc()).all()

        total_bytes = 0
        seen_paths = set()
        file_items = []
        upload_dir_resolved = settings.UPLOAD_DIR.resolve()

        for d in docs:
            if not d.file_path:
                continue
            # Verify file is an authentic user upload and not a course material
            p = Path(d.file_path)
            if not p.is_absolute():
                p = (settings.BASE_DIR / d.file_path).resolve()
            else:
                p = p.resolve()

            # Ignore course materials directory
            if "course_materials" in str(p).lower():
                continue

            real_size = d.file_size or 0
            if p.exists() and p.is_file():
                try:
                    disk_size = os.path.getsize(p)
                    # Reconcile if DB size was stale
                    if disk_size != d.file_size:
                        d.file_size = disk_size
                        real_size = disk_size
                    else:
                        real_size = disk_size
                except Exception:
                    pass

            canon_key = str(p).lower()
            if canon_key not in seen_paths:
                seen_paths.add(canon_key)
                total_bytes += real_size

            file_items.append({
                "id": d.id,
                "filename": d.filename,
                "file_path": d.file_path,
                "file_size": real_size,
                "file_type": d.file_type or "pdf",
                "upload_date": d.upload_date or datetime.utcnow(),
                "subject_id": d.subject_id,
                "subject_name": d.subject.name if d.subject else None,
                "num_chunks": d.num_chunks or 0,
                "is_course_material": d.is_course_material or False
            })

        percentage = round((total_bytes / quota) * 100, 2) if quota > 0 else 0.0

        # Warning status evaluation
        if total_bytes >= quota:
            status_str = "exceeded"
        elif total_bytes >= (quota * settings.STORAGE_WARNING_THRESHOLD):
            status_str = "warning"
        else:
            status_str = "normal"

        # Check for active storage warning record
        active_warning = db.query(StorageWarning).filter(
            StorageWarning.student_id == student_id,
            StorageWarning.status == "active"
        ).order_by(StorageWarning.start_time.desc()).first()

        cleanup_deadline = None
        days_left = None

        if status_str == "exceeded":
            if not active_warning:
                # Create persistent warning with 30-day grace period
                start_t = datetime.utcnow()
                deadline_t = start_t + timedelta(days=settings.CLEANUP_GRACE_PERIOD_DAYS)
                active_warning = StorageWarning(
                    student_id=student_id,
                    start_time=start_t,
                    deadline=deadline_t,
                    status="active",
                    reason=f"Storage quota exceeded: {self.format_bytes(total_bytes)} / {self.format_bytes(quota)}",
                    current_usage_bytes=total_bytes,
                    quota_bytes=quota,
                    reminders_sent_count=0
                )
                db.add(active_warning)
                db.commit()
                db.refresh(active_warning)

                # Send initial in-app notice
                self.create_notification(
                    db=db,
                    user_id=student_id,
                    notif_type="storage_exceeded",
                    title="Storage Quota Exceeded (30-Day Cleanup Grace Period)",
                    message=f"You have used {self.format_bytes(total_bytes)} of your {self.format_bytes(quota)} storage limit. You have 30 days until {deadline_t.strftime('%b %d, %Y')} to download and remove files before automated cleanup.",
                    link="/knowledge-base"
                )

            cleanup_deadline = active_warning.deadline
            days_left = max(0, (active_warning.deadline - datetime.utcnow()).days)
        else:
            # If student dropped below quota while warning was active, auto-resolve warning!
            if active_warning:
                active_warning.status = "resolved"
                active_warning.resolved_at = datetime.utcnow()
                db.commit()

                self.create_notification(
                    db=db,
                    user_id=student_id,
                    notif_type="cleanup_cancelled",
                    title="Storage Warning Resolved",
                    message=f"Your storage usage is now within your quota ({self.format_bytes(total_bytes)} / {self.format_bytes(quota)}). Pending cleanup has been cancelled.",
                    link="/knowledge-base"
                )

        return {
            "used_bytes": total_bytes,
            "quota_bytes": quota,
            "used_percentage": percentage,
            "file_count": len(file_items),
            "warning_status": status_str,
            "cleanup_deadline": cleanup_deadline,
            "days_left": days_left,
            "files": file_items
        }

    def check_upload_quota(
        self,
        db: Session,
        student_id: Any,
        incoming_bytes: int
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Pre-upload quota validator.
        Blocks uploads that would exceed the student's assigned quota.
        Returns: (is_allowed, error_message, breakdown)
        """
        if hasattr(student_id, "id"):
            student_id = student_id.id

        breakdown = self.get_user_storage_breakdown(db, student_id)
        current_used = breakdown["used_bytes"]
        quota = breakdown["quota_bytes"]

        if (current_used + incoming_bytes) > quota:
            msg = (
                f"Storage quota exceeded. Uploading this file ({self.format_bytes(incoming_bytes)}) "
                f"would bring your total storage to {self.format_bytes(current_used + incoming_bytes)}, "
                f"which exceeds your limit of {self.format_bytes(quota)}. Please remove old files before uploading."
            )
            return False, msg, breakdown

        return True, "", breakdown

    def check_and_update_storage_warning(
        self,
        db: Session,
        student: Any,
        simulated_usage_bytes: Optional[int] = None
    ) -> Optional[str]:
        """
        Evaluates student's current storage usage against warning threshold (80%) and quota (100%).
        Creates or resolves StorageWarning and sends notifications.
        Returns: "storage_exceeded", "storage_approaching", or None (if resolved/normal).
        """
        if hasattr(student, "id"):
            student_id = student.id
            quota = student.custom_quota_bytes if (student.custom_quota_bytes and student.custom_quota_bytes > 0) else settings.DEFAULT_STORAGE_QUOTA_BYTES
        else:
            student_id = int(student)
            s_obj = db.query(Student).filter(Student.id == student_id).first()
            quota = (s_obj.custom_quota_bytes if (s_obj and s_obj.custom_quota_bytes and s_obj.custom_quota_bytes > 0) else settings.DEFAULT_STORAGE_QUOTA_BYTES)

        if simulated_usage_bytes is not None:
            used_bytes = simulated_usage_bytes
        else:
            breakdown = self.get_user_storage_breakdown(db, student_id)
            used_bytes = breakdown["used_bytes"]

        warning_threshold = quota * settings.STORAGE_WARNING_THRESHOLD

        active_warning = db.query(StorageWarning).filter(
            StorageWarning.student_id == student_id,
            StorageWarning.status == "active"
        ).order_by(StorageWarning.start_time.desc()).first()

        if used_bytes >= quota:
            start_t = datetime.utcnow()
            deadline_t = start_t + timedelta(days=settings.CLEANUP_GRACE_PERIOD_DAYS)
            if not active_warning:
                active_warning = StorageWarning(
                    student_id=student_id,
                    start_time=start_t,
                    deadline=deadline_t,
                    status="active",
                    reason="quota_exceeded",
                    current_usage_bytes=used_bytes,
                    quota_bytes=quota,
                    reminders_sent_count=0
                )
                db.add(active_warning)
                db.commit()
                db.refresh(active_warning)

                self.create_notification(
                    db=db,
                    user_id=student_id,
                    notif_type="storage_exceeded",
                    title="Storage Quota Exceeded (30-Day Cleanup Grace Period)",
                    message=f"You have used {self.format_bytes(used_bytes)} of your {self.format_bytes(quota)} storage limit. You have 30 days until {deadline_t.strftime('%b %d, %Y')} before cleanup.",
                    link="/knowledge-base"
                )
            else:
                active_warning.current_usage_bytes = used_bytes
                active_warning.reason = "quota_exceeded"
                db.commit()

            return "storage_exceeded"

        elif used_bytes >= warning_threshold:
            start_t = datetime.utcnow()
            deadline_t = start_t + timedelta(days=settings.CLEANUP_GRACE_PERIOD_DAYS)
            if not active_warning:
                active_warning = StorageWarning(
                    student_id=student_id,
                    start_time=start_t,
                    deadline=deadline_t,
                    status="active",
                    reason="warning_threshold",
                    current_usage_bytes=used_bytes,
                    quota_bytes=quota,
                    reminders_sent_count=0
                )
                db.add(active_warning)
                db.commit()
                db.refresh(active_warning)

                self.create_notification(
                    db=db,
                    user_id=student_id,
                    notif_type="storage_approaching",
                    title="Storage Approaching Quota",
                    message=f"You have used {self.format_bytes(used_bytes)} of your {self.format_bytes(quota)} storage limit (80%+).",
                    link="/knowledge-base"
                )
            else:
                active_warning.current_usage_bytes = used_bytes
                db.commit()

            return "storage_approaching"

        else:
            if active_warning:
                active_warning.status = "resolved"
                active_warning.resolved_at = datetime.utcnow()
                db.commit()

                self.create_notification(
                    db=db,
                    user_id=student_id,
                    notif_type="cleanup_cancelled",
                    title="Storage Warning Resolved",
                    message=f"Your storage is within normal limits ({self.format_bytes(used_bytes)} / {self.format_bytes(quota)}).",
                    link="/knowledge-base"
                )
            return None

    def execute_storage_cleanup(
        self,
        db: Session,
        student_id: Any,
        is_dry_run: bool = False,
        admin_id: Optional[int] = None,
        admin_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes or simulates the 30-day retention cleanup.
        Deterministic policy: deletes only eligible user-owned uploads from data/uploads/
        starting with the oldest files first, until usage falls within quota.
        NEVER deletes course materials, user accounts, quizzes, progress, or other students' files.
        """
        if hasattr(student_id, "id"):
            student_id = student_id.id

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {"status": "error", "message": "Student not found"}

        breakdown = self.get_user_storage_breakdown(db, student_id)
        current_used = breakdown["used_bytes"]
        quota = breakdown["quota_bytes"]

        if current_used <= quota:
            return {
                "status": "not_needed",
                "is_dry_run": is_dry_run,
                "student_id": student_id,
                "files_evaluated": 0,
                "files_deleted_count": 0,
                "bytes_reclaimed": 0,
                "remaining_usage_bytes": current_used,
                "quota_bytes": quota,
                "deleted_files": [],
                "message": "Storage is within quota. No cleanup necessary."
            }

        # Query eligible files: user-owned, not course materials, oldest first
        docs = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.student_id == student_id,
            KnowledgeDocument.is_course_material == False
        ).order_by(KnowledgeDocument.upload_date.asc()).all()

        upload_dir_resolved = settings.UPLOAD_DIR.resolve()
        bytes_to_reclaim = current_used - quota
        reclaimed_bytes = 0
        deleted_records = []
        files_evaluated = 0

        for doc in docs:
            files_evaluated += 1
            file_p = Path(doc.file_path)
            if not file_p.is_absolute():
                file_p = (settings.BASE_DIR / doc.file_path).resolve()
            else:
                file_p = file_p.resolve()

            # Path traversal and ownership validation: MUST be inside UPLOAD_DIR
            try:
                if not file_p.is_relative_to(upload_dir_resolved):
                    print(f"[Cleanup] Skipping unsafe path outside upload dir: {file_p}")
                    continue
            except AttributeError:
                # Python < 3.9 fallback
                if not str(file_p).startswith(str(upload_dir_resolved)):
                    continue

            # Ensure not a shared course material
            if "course_materials" in str(file_p).lower():
                continue

            file_size = doc.file_size or 0
            if file_p.exists() and file_p.is_file():
                try:
                    file_size = os.path.getsize(file_p)
                except Exception:
                    pass

            deleted_records.append({
                "document_id": doc.id,
                "filename": doc.filename,
                "size_bytes": file_size,
                "upload_date": doc.upload_date.isoformat() if doc.upload_date else ""
            })
            reclaimed_bytes += file_size

            if not is_dry_run:
                # Real deletion
                try:
                    if file_p.exists():
                        os.remove(file_p)
                except Exception as del_err:
                    print(f"[Cleanup] File unlink error for {file_p}: {del_err}")

                # Delete semantic chunks & DB document
                db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
                db.delete(doc)

            # Check if we have reclaimed enough space to meet quota
            if (current_used - reclaimed_bytes) <= quota:
                break

        remaining_usage = max(0, current_used - reclaimed_bytes)

        if not is_dry_run:
            db.commit()

            # Update or resolve active storage warning
            active_warning = db.query(StorageWarning).filter(
                StorageWarning.student_id == student_id,
                StorageWarning.status == "active"
            ).first()

            if active_warning:
                active_warning.status = "cleanup_executed"
                active_warning.resolved_at = datetime.utcnow()
                db.commit()

            # Record in cleanup log
            log_entry = StorageCleanupLog(
                student_id=student_id,
                trigger_type="manual_admin" if admin_id else "scheduled",
                is_dry_run=False,
                status="success",
                files_deleted_count=len(deleted_records),
                bytes_reclaimed=reclaimed_bytes,
                deleted_files_json=json.dumps(deleted_records),
                executed_at=datetime.utcnow()
            )
            db.add(log_entry)
            db.commit()

            # Record in audit log
            self.log_audit_event(
                db=db,
                admin_email=admin_email or "system@learnai.edu",
                action="cleanup_executed",
                target_type="storage",
                target_id=str(student_id),
                details={
                    "student_name": student.name,
                    "student_email": student.email,
                    "files_deleted": len(deleted_records),
                    "bytes_reclaimed": reclaimed_bytes,
                    "remaining_usage_bytes": remaining_usage
                },
                admin_id=admin_id
            )

            # In-app notification to student
            self.create_notification(
                db=db,
                user_id=student_id,
                notif_type="cleanup_executed",
                title="Automated Storage Cleanup Completed",
                message=f"30-day retention cleanup executed: {len(deleted_records)} files were removed to bring storage within quota. Reclaimed {self.format_bytes(reclaimed_bytes)}.",
                link="/knowledge-base"
            )
        else:
            # Audit dry run
            if admin_email:
                self.log_audit_event(
                    db=db,
                    admin_email=admin_email,
                    action="cleanup_dry_run",
                    target_type="storage",
                    target_id=str(student_id),
                    details={
                        "student_name": student.name,
                        "student_email": student.email,
                        "simulated_files_deleted": len(deleted_records),
                        "simulated_bytes_reclaimed": reclaimed_bytes
                    },
                    admin_id=admin_id
                )

        return {
            "status": "success",
            "is_dry_run": is_dry_run,
            "student_id": student_id,
            "files_evaluated": files_evaluated,
            "files_deleted_count": len(deleted_records),
            "bytes_reclaimed": reclaimed_bytes,
            "remaining_usage_bytes": remaining_usage,
            "quota_bytes": quota,
            "deleted_files": deleted_records,
            "message": f"{'[DRY RUN] Would delete' if is_dry_run else 'Deleted'} {len(deleted_records)} file(s), reclaiming {self.format_bytes(reclaimed_bytes)}."
        }

    # ----------------- In-App Notifications -----------------

    def create_notification(
        self,
        db: Session,
        user_id: Optional[int] = None,
        notif_type: str = "account_notice",
        title: str = "Notification",
        message: str = "",
        link: str = "",
        deduplicate_hours: int = 24,
        student_id: Optional[int] = None,
        notification_type: Optional[str] = None,
        severity: Optional[str] = None,
        action_url: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Creates persistent in-app notifications with automated deduplication
        to prevent spamming identical alerts on every scan.
        Supports both user_id/student_id and link/action_url argument conventions.
        """
        target_user_id = user_id if user_id is not None else student_id
        if target_user_id is None:
            return None

        actual_type = notification_type or notif_type
        actual_link = action_url if action_url is not None else link

        # Check student notification preferences if opted out
        student = db.query(Student).filter(Student.id == target_user_id).first()
        if student:
            user_notifs_pref = student.settings.get("notifications", {})
            type_to_pref = {
                "learning_reminder": "learning_reminders",
                "study_reminder": "learning_reminders",
                "study_goal": "study_goal_reminders",
                "study_goal_reminder": "study_goal_reminders",
                "quiz_completed": "quiz_results",
                "quiz_result": "quiz_results",
                "quiz_scored": "quiz_results",
                "recommendation": "learning_recommendations",
                "learning_recommendation": "learning_recommendations",
                "feedback_reply": "feedback_replies",
                "feedback_received": "feedback_replies",
                "announcement": "platform_announcements",
                "platform_announcement": "platform_announcements",
            }
            pref_key = type_to_pref.get(actual_type)
            if pref_key and not user_notifs_pref.get(pref_key, True):
                # Student opted out of this notification category
                return None

        if deduplicate_hours > 0:
            since = datetime.utcnow() - timedelta(hours=deduplicate_hours)
            existing = db.query(Notification).filter(
                Notification.user_id == target_user_id,
                Notification.type == actual_type,
                Notification.title == title,
                Notification.created_at >= since
            ).first()
            if existing:
                return existing

        notif = Notification(
            user_id=target_user_id,
            type=actual_type,
            title=title,
            message=message,
            link=actual_link,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    # ----------------- Audit Logging -----------------

    def log_audit_event(
        self,
        db: Session,
        admin_email: Optional[str] = None,
        action: str = "general_action",
        target_type: str = "system",
        target_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        admin_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        actor: Optional[Any] = None
    ) -> AuditLog:
        """
        Securely records administrative events.
        Sanitizes passwords, secrets, and raw tokens before persistence.
        Supports passing an actor (Student instance) or explicit admin_email/admin_id.
        """
        if actor is not None:
            if hasattr(actor, "email"):
                admin_email = actor.email
            elif isinstance(actor, str):
                admin_email = actor
            if hasattr(actor, "id") and admin_id is None:
                admin_id = actor.id

        safe_details = details.copy() if details else {}
        # Strip potential sensitive keys
        for sensitive_key in ["password", "token", "access_token", "secret", "hashed_password", "credential"]:
            if sensitive_key in safe_details:
                safe_details[sensitive_key] = "[REDACTED]"

        log_entry = AuditLog(
            admin_id=admin_id,
            admin_email=admin_email.strip().lower() if admin_email else "system",
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details_json=json.dumps(safe_details),
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    # ----------------- Admin Dashboard Metrics -----------------

    def get_dashboard_metrics(self, db: Session) -> Dict[str, Any]:
        """
        Computes authentic backend statistics for the admin dashboard.
        """
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        # 1. Total registered users
        total_users = db.query(Student).count()

        # 2. Active users (based on last_login or activity / quiz / chat in window)
        active_student_ids_7d = set()
        active_student_ids_30d = set()

        # Check last_login
        for s in db.query(Student).filter(Student.last_login.isnot(None)).all():
            if s.last_login >= seven_days_ago:
                active_student_ids_7d.add(s.id)
            if s.last_login >= thirty_days_ago:
                active_student_ids_30d.add(s.id)

        # Check recent learning activities
        for a in db.query(LearningActivity.student_id).filter(LearningActivity.timestamp >= seven_days_ago).all():
            active_student_ids_7d.add(a[0])
        for a in db.query(LearningActivity.student_id).filter(LearningActivity.timestamp >= thirty_days_ago).all():
            active_student_ids_30d.add(a[0])

        # Check recent quiz attempts
        for q in db.query(QuizAttempt.student_id).filter(QuizAttempt.completed_at >= seven_days_ago).all():
            active_student_ids_7d.add(q[0])
        for q in db.query(QuizAttempt.student_id).filter(QuizAttempt.completed_at >= thirty_days_ago).all():
            active_student_ids_30d.add(q[0])

        # 3. Total uploaded storage consumed on disk across all user uploads
        user_uploads = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.is_course_material == False
        ).all()
        seen_paths = set()
        total_storage_bytes = 0
        for doc in user_uploads:
            p = Path(doc.file_path).resolve()
            if "course_materials" in str(p).lower():
                continue
            key = str(p).lower()
            if key not in seen_paths:
                seen_paths.add(key)
                if p.exists() and p.is_file():
                    total_storage_bytes += os.path.getsize(p)
                else:
                    total_storage_bytes += doc.file_size or 0

        # 4. Count users over quota and users in warning period
        all_students = db.query(Student).all()
        users_over_quota = 0
        for st in all_students:
            usage = self.get_user_storage_breakdown(db, st.id)
            if usage["warning_status"] == "exceeded":
                users_over_quota += 1

        users_in_warning = db.query(StorageWarning).filter(
            StorageWarning.status == "active"
        ).count()

        # 5. Feedback counts
        pending_feedback = db.query(Feedback).filter(
            Feedback.status.in_(["open", "reopened"])
        ).count()

        # Unread replies: replies by students that admin has not answered, or open threads
        unread_admin_replies = db.query(Feedback).filter(
            Feedback.status == "awaiting_admin"
        ).count()

        # 6. Recent administrative events
        recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(8).all()
        recent_events = [
            {
                "id": lg.id,
                "admin_email": lg.admin_email,
                "action": lg.action,
                "target_type": lg.target_type,
                "target_id": lg.target_id,
                "details": json.loads(lg.details_json) if lg.details_json else {},
                "timestamp": lg.timestamp.isoformat()
            }
            for lg in recent_logs
        ]

        avg_rating_val = db.query(func.avg(Feedback.rating)).scalar()
        avg_rating = round(float(avg_rating_val), 1) if avg_rating_val is not None else 5.0
        formatted_storage = self.format_bytes(total_storage_bytes)

        return {
            "users": {
                "total_registered": total_users,
                "active_last_7d": len(active_student_ids_7d),
                "active_last_30d": len(active_student_ids_30d),
            },
            "storage": {
                "total_user_storage_bytes": total_storage_bytes,
                "total_user_storage_formatted": formatted_storage,
                "users_over_quota": users_over_quota,
                "users_in_warning": users_in_warning,
            },
            "feedback": {
                "open_feedback": pending_feedback,
                "awaiting_admin": unread_admin_replies,
                "average_rating": avg_rating,
            },
            "recent_events": recent_events,
            "total_users": total_users,
            "active_users_7d": len(active_student_ids_7d),
            "active_users_30d": len(active_student_ids_30d),
            "total_storage_bytes": total_storage_bytes,
            "users_over_quota": users_over_quota,
            "users_in_warning": users_in_warning,
            "pending_feedback_count": pending_feedback,
            "unread_admin_replies_count": unread_admin_replies,
        }

    # ----------------- Utility -----------------

    @staticmethod
    def format_bytes(num_bytes: int) -> str:
        """Converts raw byte counts into human-readable strings (KB, MB, GB)."""
        if num_bytes < 1024:
            return f"{num_bytes} B"
        elif num_bytes < 1024 * 1024:
            return f"{round(num_bytes / 1024, 1)} KB"
        elif num_bytes < 1024 * 1024 * 1024:
            return f"{round(num_bytes / (1024 * 1024), 1)} MB"
        else:
            return f"{round(num_bytes / (1024 * 1024 * 1024), 2)} GB"

    # ----------------- Student Detail & Account Management -----------------

    def get_student_detail(self, db: Session, student_id: int) -> Optional[Dict[str, Any]]:
        """Compiles comprehensive profile, storage, academic, and audit record for a single student."""
        st = db.query(Student).filter(Student.id == student_id).first()
        if not st:
            return None

        storage = self.get_user_storage_breakdown(db, student_id)

        # Enrolled subjects
        enrolled_list = []
        try:
            if st.enrolled_subjects:
                parsed = json.loads(st.enrolled_subjects)
                if isinstance(parsed, list):
                    enrolled_list = [str(x) for x in parsed]
        except Exception:
            enrolled_list = []

        # Quiz attempts
        attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == student_id).all()
        quiz_count = len(attempts)
        avg_score = round(sum((a.score or 0.0) for a in attempts) / quiz_count, 1) if quiz_count > 0 else 0.0

        # Storage warnings
        warnings = db.query(StorageWarning).filter(StorageWarning.student_id == student_id).order_by(StorageWarning.start_time.desc()).all()
        warnings_out = [
            {
                "id": w.id,
                "student_id": w.student_id,
                "student_name": st.name,
                "student_email": st.email,
                "start_time": w.start_time,
                "deadline": w.deadline,
                "status": w.status,
                "reason": w.reason,
                "current_usage_bytes": w.current_usage_bytes,
                "quota_bytes": w.quota_bytes,
                "reminders_sent_count": w.reminders_sent_count,
                "created_at": w.created_at
            }
            for w in warnings
        ]

        # Recent feedbacks
        feedbacks = db.query(Feedback).filter(Feedback.student_id == student_id).order_by(Feedback.created_at.desc()).limit(10).all()
        feedbacks_out = [
            {
                "id": fb.id,
                "student_id": fb.student_id,
                "student_name": st.name,
                "student_email": st.email,
                "subject": fb.subject or "Platform Feedback",
                "category": fb.category or "General",
                "rating": fb.rating or 5,
                "comment": fb.comment or "",
                "status": fb.status or "open",
                "created_at": fb.created_at,
                "updated_at": fb.updated_at,
                "replies": [
                    {
                        "id": r.id,
                        "feedback_id": r.feedback_id,
                        "sender_id": r.sender_id,
                        "sender_role": r.sender_role,
                        "sender_name": r.sender_name,
                        "message": r.message,
                        "created_at": r.created_at
                    }
                    for r in fb.replies
                ]
            }
            for fb in feedbacks
        ]

        # Recent notifications
        notifs = db.query(Notification).filter(Notification.user_id == student_id).order_by(Notification.created_at.desc()).limit(15).all()
        notifs_out = [
            {
                "id": n.id,
                "user_id": n.user_id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "link": n.link or "",
                "is_read": n.is_read,
                "created_at": n.created_at
            }
            for n in notifs
        ]

        # Courses detail
        all_subjects = db.query(Subject).all()
        courses_out = []
        for subj in all_subjects:
            is_matched = (
                not enrolled_list
                or subj.code in enrolled_list
                or subj.name in enrolled_list
                or str(subj.id) in enrolled_list
                or any(e.lower() in subj.name.lower() or subj.name.lower() in e.lower() for e in enrolled_list)
            )
            if is_matched:
                courses_out.append({
                    "id": subj.id,
                    "code": subj.code,
                    "name": subj.name,
                    "title": subj.name,
                    "semester": subj.semester or "6th Semester",
                    "department": subj.department or st.department or "General"
                })

        # Documents detail
        documents_out = [
            {
                "id": f["id"],
                "file_name": f["filename"],
                "filename": f["filename"],
                "file_size": f["file_size"],
                "uploaded_at": f["upload_date"],
                "upload_date": f["upload_date"],
                "subject_code": f.get("subject_name") or "General",
                "is_course_material": f.get("is_course_material", False)
            }
            for f in storage.get("files", [])
        ]

        # Quiz attempts detail
        quiz_attempts_out = [
            {
                "id": a.id,
                "topic": a.quiz.topic if a.quiz else "Quiz Practice",
                "difficulty": a.quiz.difficulty if a.quiz else "Intermediate",
                "score": a.score or 0,
                "created_at": getattr(a, "completed_at", None) or getattr(a, "started_at", None) or datetime.utcnow()
            }
            for a in attempts[:15]
        ]

        return {
            "id": st.id,
            "name": st.name,
            "email": st.email,
            "role": st.role or ("admin" if st.is_admin_user else "student"),
            "status": getattr(st, "status", "active") or "active",
            "is_admin": st.is_admin_user,
            "department": st.department or "General",
            "year": st.year or "3rd Year",
            "semester": st.semester or "6th Semester",
            "current_skill_level": getattr(st, "current_skill_level", "Intermediate") or "Intermediate",
            "preferred_learning_style": st.preferred_learning_style,
            "enrolled_subjects": enrolled_list,
            "created_at": st.created_at or datetime.utcnow(),
            "last_login": st.last_login,
            "storage": storage,
            "storage_used_bytes": storage["used_bytes"],
            "custom_quota_bytes": storage["quota_bytes"],
            "quiz_attempts_count": quiz_count,
            "quiz_average_score": avg_score,
            "storage_warnings": warnings_out,
            "recent_feedbacks": feedbacks_out,
            "recent_notifications": notifs_out,
            "courses": courses_out,
            "documents": documents_out,
            "quiz_attempts": quiz_attempts_out
        }

    # ----------------- Alerts & Announcements -----------------

    def broadcast_alert(
        self,
        db: Session,
        admin: Student,
        title: str,
        message: str,
        category: str = "announcement",
        target_scope: str = "all",
        student_ids: Optional[List[int]] = None,
        link: str = ""
    ) -> Dict[str, Any]:
        """Creates persistent in-app notifications for individual or all students."""
        if target_scope == "all":
            recipients = db.query(Student).all()
        elif target_scope in ("individual", "selected"):
            if not student_ids:
                recipients = []
            else:
                recipients = db.query(Student).filter(Student.id.in_(student_ids)).all()
        else:
            recipients = db.query(Student).all()

        count = 0
        created_ids = []
        safe_link = link or ""
        if safe_link.strip().lower().startswith("/admin"):
            safe_link = "/dashboard"

        for st in recipients:
            notif = self.create_notification(
                db=db,
                user_id=st.id,
                notif_type=category,
                title=title,
                message=message,
                link=safe_link,
                deduplicate_hours=0
            )
            if notif:
                created_ids.append(notif.id)
            count += 1

        self.log_audit_event(
            db=db,
            actor=admin,
            action="alert_broadcast",
            target_type="notification",
            target_id=target_scope,
            details={
                "title": title,
                "category": category,
                "target_scope": target_scope,
                "recipients_count": count,
                "delivered_count": len(created_ids)
            }
        )

        return {
            "message": f"Successfully sent notification to {count} recipient(s).",
            "recipients_count": count,
            "delivered_count": len(created_ids),
            "notification_id": created_ids[0] if created_ids else None,
            "notification_ids": created_ids,
            "alert_title": title,
            "category": category,
            "created_at": datetime.utcnow()
        }

    # ----------------- Account Removal & Deletion -----------------

    def delete_student_account(
        self,
        db: Session,
        admin: Student,
        student: Student,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Permanently and safely removes a student account with strict safeguards:
        - Preserves institutional course materials (unlinks ownership to admin).
        - Safely unlinks / clears foreign key references in AuditLog and FeedbackReply.
        - Deletes personal uploaded files and their DocumentChunks.
        - Records an audit log before committing the deletion.
        """
        student_id = student.id
        student_email = student.email
        student_name = student.name

        # 1. Protect course materials: if any document has is_course_material == True or in course_materials directory, reassign ownership to admin
        docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.student_id == student_id).all()
        for doc in docs:
            file_p = Path(doc.file_path) if doc.file_path else None
            is_cm = (
                getattr(doc, "is_course_material", False)
                or (file_p and "course_materials" in str(file_p).lower())
            )
            if is_cm:
                # Reassign to admin so it remains preserved in the institution's knowledge base and foreign keys stay valid
                doc.student_id = admin.id
            else:
                # Personal upload - safe to remove file & chunks
                if file_p and file_p.exists() and file_p.is_file():
                    try:
                        os.remove(file_p)
                    except Exception as e:
                        print(f"[DeleteStudent] File unlink error for {file_p}: {e}")
                db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
                db.delete(doc)

        # 2. Clear AuditLog admin_id reference if this user ever acted as an admin
        db.query(AuditLog).filter(AuditLog.admin_id == student_id).update({AuditLog.admin_id: None})

        # 3. Clean up FeedbackReply references if sender_id == student_id on any other feedback
        other_replies = db.query(FeedbackReply).filter(FeedbackReply.sender_id == student_id).all()
        for reply in other_replies:
            reply.sender_id = admin.id
            reply.sender_name = f"{student_name} (Removed Student)"

        # 4. Record audit event
        self.log_audit_event(
            db=db,
            actor=admin,
            action="student_account_deleted",
            target_type="user",
            target_id=str(student_id),
            details={
                "deleted_student_id": student_id,
                "deleted_student_email": student_email,
                "deleted_student_name": student_name
            },
            ip_address=ip_address
        )

        # 5. Delete the student record (cascades to quizzes, activities, personal notifications, feedbacks, etc.)
        db.delete(student)
        db.commit()

        return {
            "status": "success",
            "message": f"Student account '{student_email}' has been permanently deleted.",
            "deleted_student_id": student_id,
            "deleted_student_email": student_email
        }


    # ----------------- System Health & Monitoring -----------------

    def get_system_health(self, db: Session) -> Dict[str, Any]:
        """Collects authentic backend, database, disk, AI, and worker signals."""
        now = datetime.utcnow()
        db_path = settings.BASE_DIR / "backend" / "learnai.db"
        if not db_path.exists():
            db_path = settings.BASE_DIR / "learnai.db"

        db_size = db_path.stat().st_size if db_path.exists() else 0
        total_students = db.query(Student).count()
        total_docs = db.query(KnowledgeDocument).count()
        total_quizzes = db.query(QuizAttempt).count()
        total_audits = db.query(AuditLog).count()

        upload_dir = settings.UPLOAD_DIR
        upload_bytes = 0
        file_count = 0
        if upload_dir.exists():
            for f in upload_dir.rglob("*"):
                if f.is_file():
                    upload_bytes += f.stat().st_size
                    file_count += 1

        try:
            usage = shutil.disk_usage(settings.BASE_DIR)
            disk_total = usage.total
            disk_free = usage.free
            disk_free_formatted = self.format_bytes(disk_free)
        except Exception:
            disk_total = None
            disk_free = None
            disk_free_formatted = "Unavailable"

        gemini_ok = bool(settings.GEMINI_API_KEY)
        ai_status = "operational" if gemini_ok else "offline_fallback"
        ai_notes = (
            "Google Gemini Flash API active and grounded"
            if gemini_ok
            else "Running on LearnAI Deterministic Academic Engine (Offline Fallback)"
        )

        active_warnings = db.query(StorageWarning).filter(StorageWarning.status == "active").count()
        pending_cleanups = db.query(StorageWarning).filter(
            StorageWarning.status == "active",
            StorageWarning.deadline <= now
        ).count()
        last_cleanup = db.query(StorageCleanupLog).order_by(StorageCleanupLog.executed_at.desc()).first()

        recent_errors = db.query(AuditLog).filter(
            AuditLog.action.like("%error%") | AuditLog.action.like("%fail%")
        ).count()

        overall_status = "healthy"
        if pending_cleanups > 0:
            overall_status = "warning"

        return {
            "overall_status": overall_status,
            "timestamp": now,
            "version": settings.VERSION,
            "backend_uptime": "Online & Operational",
            "database": {
                "status": "connected",
                "connected": True,
                "database_url_safe": f"sqlite:///{db_path.name}",
                "database_size_bytes": db_size,
                "database_size_formatted": self.format_bytes(db_size),
                "total_students": total_students,
                "total_documents": total_docs,
                "total_quizzes": total_quizzes,
                "total_audit_events": total_audits
            },
            "storage": {
                "status": "healthy",
                "upload_dir": str(upload_dir.relative_to(settings.BASE_DIR)),
                "total_uploads_bytes": upload_bytes,
                "total_uploads_formatted": self.format_bytes(upload_bytes),
                "total_uploaded_files": file_count,
                "disk_total_bytes": disk_total,
                "disk_free_bytes": disk_free,
                "disk_free_formatted": disk_free_formatted,
                "disk_used_bytes": (disk_total - disk_free) if (disk_total and disk_free) else 0,
                "disk_used_percent": round(((disk_total - disk_free) / disk_total) * 100, 1) if (disk_total and disk_total > 0 and disk_free) else 0.0
            },
            "ai_provider": {
                "status": ai_status,
                "provider_name": "Google Gemini" if gemini_ok else "Deterministic Academic Engine",
                "provider": "Google Gemini" if gemini_ok else "Deterministic Academic Engine",
                "model": settings.GEMINI_MODEL,
                "api_key_configured": gemini_ok,
                "fallback_engine_ready": True,
                "notes": ai_notes
            },
            "ai": {
                "status": ai_status,
                "provider_name": "Google Gemini" if gemini_ok else "Deterministic Academic Engine",
                "provider": "Google Gemini" if gemini_ok else "Deterministic Academic Engine",
                "model": settings.GEMINI_MODEL,
                "api_key_configured": gemini_ok,
                "fallback_engine_ready": True,
                "notes": ai_notes
            },
            "status": overall_status,
            "background_tasks": {
                "status": "operational",
                "cleanup_dry_run_mode": True,
                "active_warnings_count": active_warnings,
                "pending_cleanup_count": pending_cleanups,
                "last_cleanup_timestamp": last_cleanup.executed_at if last_cleanup else None
            },
            "recent_error_events_count": recent_errors
        }

    # ----------------- Admin Settings -----------------

    def get_admin_settings(self) -> Dict[str, Any]:
        """Returns active operational settings."""
        default_mb = int(settings.DEFAULT_STORAGE_QUOTA_BYTES / (1024 * 1024))
        warn_pct = int(settings.STORAGE_WARNING_THRESHOLD * 100)
        return {
            "default_storage_quota_bytes": settings.DEFAULT_STORAGE_QUOTA_BYTES,
            "default_storage_quota_mb": default_mb,
            "default_quota_mb": default_mb,
            "max_storage_quota_bytes": settings.MAX_STORAGE_QUOTA_BYTES,
            "storage_warning_threshold": settings.STORAGE_WARNING_THRESHOLD,
            "warning_threshold_pct": warn_pct,
            "cleanup_grace_period_days": settings.CLEANUP_GRACE_PERIOD_DAYS,
            "retention_days": settings.CLEANUP_GRACE_PERIOD_DAYS,
            "cleanup_dry_run_enabled": True, # Safety dry-run lock
            "dry_run_default": True,
            "admin_emails": settings.ADMIN_EMAILS,
            "cors_origins": settings.CORS_ORIGINS,
            "access_token_expire_days": int(settings.ACCESS_TOKEN_EXPIRE_MINUTES / (60 * 24)),
            "max_upload_mb": 25
        }

    def update_admin_settings(self, db: Session, admin: Student, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Updates operational settings and records audit event."""
        old_settings = self.get_admin_settings()

        quota_mb = updates.get("default_storage_quota_mb") or updates.get("default_quota_mb")
        if quota_mb:
            settings.DEFAULT_STORAGE_QUOTA_BYTES = int(quota_mb) * 1024 * 1024

        thresh = updates.get("storage_warning_threshold")
        if thresh is None and updates.get("warning_threshold_pct") is not None:
            thresh = float(updates["warning_threshold_pct"]) / 100.0
        if thresh is not None:
            settings.STORAGE_WARNING_THRESHOLD = float(thresh)

        days = updates.get("cleanup_grace_period_days") or updates.get("retention_days")
        if days:
            settings.CLEANUP_GRACE_PERIOD_DAYS = int(days)

        self.log_audit_event(
            db=db,
            actor=admin,
            action="settings_updated",
            target_type="system",
            target_id="settings",
            details={
                "previous": old_settings,
                "updated": updates
            }
        )
        return self.get_admin_settings()


admin_service = AdminService()
