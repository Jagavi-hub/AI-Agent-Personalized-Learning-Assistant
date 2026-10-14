import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.entities import StudyPlan, StudyTask, LearningActivity, Student
from app.services.analytics_service import analytics_service

class StudyPlannerService:
    """
    Personalized Study Planner service.
    Generates intelligent daily/weekly schedules tailored to student goals,
    exam target dates, available weekly hours, and diagnosed weak areas.
    """

    def generate_plan(
        self,
        db: Session,
        student_id: int,
        title: str,
        subject: str,
        target_date: str,
        available_hours_per_week: int,
        focus_weak_topics: bool = True
    ) -> StudyPlan:
        """
        Creates an actionable 7-day study plan with daily milestones.
        Prioritizes student's active weak topics (e.g. Backpropagation, Normalization).
        """
        # Deactivate old plans for this subject if user chooses
        db.query(StudyPlan).filter(
            StudyPlan.student_id == student_id,
            StudyPlan.subject == subject
        ).update({"is_active": False})
        db.commit()

        # 1. Inspect weak topics from real analytics
        perf = analytics_service.get_student_performance_summary(db, student_id)
        weak_topics = [w["topic"] for w in perf["weak_topics"]]

        # 2. Create StudyPlan entity
        plan = StudyPlan(
            student_id=student_id,
            title=title,
            subject=subject,
            target_date=target_date,
            available_hours_per_week=available_hours_per_week,
            is_active=True
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

        # 3. Build 7-day curriculum milestones
        primary_weak = weak_topics[0] if weak_topics else "Core Conceptual Foundations"
        secondary_weak = weak_topics[1] if len(weak_topics) > 1 else "Theoretical Invariants"

        day_templates = [
            {
                "day": "Day 1 (Mon)",
                "topic": primary_weak,
                "desc": f"Diagnostic Review: Deconstruct mathematical chain rule and gradient flow in {primary_weak}.",
                "minutes": 60,
                "priority": "High"
            },
            {
                "day": "Day 2 (Tue)",
                "topic": primary_weak,
                "desc": f"Applied Problem Solving: Trace numerical forward and backward passes using LearnAI Assistant.",
                "minutes": 45,
                "priority": "High"
            },
            {
                "day": "Day 3 (Wed)",
                "topic": "Gradient Descent & Optimization",
                "desc": "Mechanisms Analysis: Compare Mini-batch SGD vs. Adam optimizer and momentum velocity.",
                "minutes": 45,
                "priority": "Medium"
            },
            {
                "day": "Day 4 (Thu)",
                "topic": secondary_weak,
                "desc": f"Remediation Sprint: Reconstruct {secondary_weak} definitions, boundary conditions, and proofs.",
                "minutes": 60,
                "priority": "High"
            },
            {
                "day": "Day 5 (Fri)",
                "topic": "Syllabus Integration",
                "desc": "Courseware Synthesis: Consult uploaded lecture notes in Knowledge Base and summarize key formulas.",
                "minutes": 40,
                "priority": "Medium"
            },
            {
                "day": "Day 6 (Sat)",
                "topic": "Comprehensive Practice",
                "desc": "Active Recall: Complete a 10-question timed practice quiz on LearnAI to benchmark retention.",
                "minutes": 50,
                "priority": "High"
            },
            {
                "day": "Day 7 (Sun)",
                "topic": "Mastery Verification & Wrap-up",
                "desc": "Error Audit: Review incorrect answers, consult AI tutor for remaining doubts, and finalize notes.",
                "minutes": 30,
                "priority": "Medium"
            }
        ]

        # 4. Insert tasks
        task_entities = []
        for d in day_templates:
            task = StudyTask(
                plan_id=plan.id,
                student_id=student_id,
                topic=d["topic"],
                task_description=d["desc"],
                day_of_week=d["day"],
                estimated_minutes=d["minutes"],
                priority=d["priority"],
                is_completed=False
            )
            task_entities.append(task)

        db.bulk_save_objects(task_entities)

        # 5. Record activity
        act = LearningActivity(
            student_id=student_id,
            activity_type="study_plan_created",
            title=f"Generated Study Plan: {title}",
            description=f"Curated 7 daily tasks for {subject} targeting {primary_weak}.",
            timestamp=datetime.utcnow()
        )
        db.add(act)
        db.commit()
        db.refresh(plan)

        return plan

    def get_plans(self, db: Session, student_id: int) -> List[StudyPlan]:
        return db.query(StudyPlan).filter(
            StudyPlan.student_id == student_id
        ).order_by(StudyPlan.created_at.desc()).all()

    def toggle_task(self, db: Session, student_id: int, task_id: int, is_completed: bool) -> StudyTask:
        task = db.query(StudyTask).filter(
            StudyTask.id == task_id,
            StudyTask.student_id == student_id
        ).first()
        if not task:
            raise ValueError("Task not found or unauthorized.")

        task.is_completed = is_completed
        task.completed_at = datetime.utcnow() if is_completed else None
        db.commit()
        db.refresh(task)

        if is_completed:
            act = LearningActivity(
                student_id=student_id,
                activity_type="study_task_completed",
                title=f"Completed Task: {task.topic}",
                description=task.task_description[:80],
                timestamp=datetime.utcnow()
            )
            db.add(act)
            db.commit()

        return task

planner_service = StudyPlannerService()
