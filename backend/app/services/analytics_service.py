import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.entities import (
    Student, Subject, Quiz, QuizAttempt, QuizAnswer,
    Question, LearningActivity, LearningGoal, Recommendation,
    StudyTask
)

class AnalyticsService:
    """Computes transparent, data-driven student performance metrics."""

    def get_student_performance_summary(self, db: Session, student_id: int) -> Dict[str, Any]:
        """
        Aggregate quiz attempts, topic mastery, and subject scores.
        Only calculates from real database records.
        """
        # 1. Fetch attempts
        attempts = db.query(QuizAttempt, Quiz).join(
            Quiz, QuizAttempt.quiz_id == Quiz.id
        ).filter(
            QuizAttempt.student_id == student_id
        ).order_by(QuizAttempt.completed_at.asc()).all()

        total_quizzes = len(attempts)
        avg_score = round(
            sum(a[0].percentage for a in attempts) / total_quizzes, 1
        ) if total_quizzes > 0 else 0.0

        # 2. Topic-wise performance by inspecting actual submitted questions & answers
        answers_query = db.query(QuizAnswer, Question).join(
            Question, QuizAnswer.question_id == Question.id
        ).join(
            QuizAttempt, QuizAnswer.attempt_id == QuizAttempt.id
        ).filter(
            QuizAttempt.student_id == student_id
        ).all()

        topic_stats = {} # topic -> {total: int, correct: int}
        for ans, q in answers_query:
            t = q.topic or "General"
            if t not in topic_stats:
                topic_stats[t] = {"total": 0, "correct": 0}
            topic_stats[t]["total"] += 1
            if ans.is_correct:
                topic_stats[t]["correct"] += 1

        all_topic_performance = []
        strong_topics = []
        weak_topics = []

        for t, s in topic_stats.items():
            pct = round((s["correct"] / s["total"] * 100), 1) if s["total"] > 0 else 0.0
            if pct >= 75.0:
                status = "Strong"
            elif pct < 60.0:
                status = "Weak"
            else:
                status = "Moderate"

            item = {
                "topic": t,
                "total_questions": s["total"],
                "correct_questions": s["correct"],
                "mastery_percentage": pct,
                "status": status
            }
            all_topic_performance.append(item)
            if status == "Strong":
                strong_topics.append(item)
            elif status == "Weak":
                weak_topics.append(item)

        # 3. Quiz Score Trend
        quiz_trend = []
        for att, q in attempts:
            quiz_trend.append({
                "date": att.completed_at.strftime("%b %d, %H:%M"),
                "score": att.score,
                "total": att.total_questions,
                "percentage": att.percentage,
                "topic": q.topic
            })

        # 4. Subject performance
        subjects = db.query(Subject).all()
        subject_performance = []
        for subj in subjects:
            subj_attempts = [
                att for att, q in attempts if q.subject_id == subj.id
            ]
            if subj_attempts:
                sub_avg = round(sum(a.percentage for a in subj_attempts) / len(subj_attempts), 1)
                subject_performance.append({
                    "subject_name": subj.name,
                    "subject_code": subj.code,
                    "score": sub_avg,
                    "quizzes_count": len(subj_attempts)
                })
            else:
                subject_performance.append({
                    "subject_name": subj.name,
                    "subject_code": subj.code,
                    "score": 0.0,
                    "quizzes_count": 0
                })

        # 5. Learning goals, study tasks & activities
        goals = db.query(LearningGoal).filter(LearningGoal.student_id == student_id).all()
        completed_goals = sum(1 for g in goals if g.is_completed)

        tasks = db.query(StudyTask).filter(StudyTask.student_id == student_id).all()
        completed_tasks = sum(1 for t in tasks if t.is_completed)

        activities = db.query(LearningActivity).filter(
            LearningActivity.student_id == student_id
        ).order_by(LearningActivity.timestamp.desc()).limit(10).all()

        return {
            "total_quizzes_taken": total_quizzes,
            "average_score_percentage": avg_score,
            "topics_mastered_count": len(strong_topics),
            "weak_topics_count": len(weak_topics),
            "strong_topics": strong_topics,
            "weak_topics": weak_topics,
            "all_topic_performance": all_topic_performance,
            "quiz_trend": quiz_trend,
            "subject_performance": subject_performance,
            "recent_activities": activities,
            "study_goals_completed": completed_goals,
            "total_study_goals": len(goals),
            "study_tasks_completed": completed_tasks,
            "total_study_tasks": len(tasks)
        }

    def get_weak_topics_list(self, db: Session, student_id: int) -> List[str]:
        summary = self.get_student_performance_summary(db, student_id)
        return [item["topic"] for item in summary["weak_topics"]]

analytics_service = AnalyticsService()
