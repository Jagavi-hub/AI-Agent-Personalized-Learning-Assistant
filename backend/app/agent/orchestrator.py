import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    Student, Conversation, ChatMessage, LearningActivity,
    Recommendation, KnowledgeDocument, DocumentChunk
)
from app.services.llm_service import llm_service
from app.retrieval.engine import retrieval_engine
from app.services.analytics_service import analytics_service

class AIAgentOrchestrator:
    """
    Dedicated AI Agent Orchestrator for LearnAI.
    Coordinates student profile context, historical performance metrics,
    knowledge base RAG, tool calling, and action execution.
    """

    def process_student_request(
        self,
        db: Session,
        student_id: int,
        message: str,
        conversation_id: Optional[int] = None,
        action_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main Agent Execution Lifecycle:
        1. Receive request.
        2. Load student profile.
        3. Retrieve learning history & weak areas.
        4. Classify requirement & select tool/action.
        5. Retrieve knowledge base context (RAG) if relevant.
        6. Execute tool & generate pedagogical response.
        7. Record conversation, chat message, and activity.
        8. Return structured output with agent thought metadata.
        """

        # Step 1: Load student profile
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError(f"Student with id {student_id} not found.")

        profile_data = {
            "name": student.name,
            "department": student.department,
            "year": student.year,
            "semester": student.semester,
            "current_skill_level": student.current_skill_level,
            "preferred_learning_style": student.preferred_learning_style,
            "learning_goals": json.loads(student.learning_goals) if student.learning_goals else [],
            "areas_of_interest": json.loads(student.areas_of_interest) if student.areas_of_interest else []
        }

        # Step 2: Retrieve learning history & performance metrics
        perf_summary = analytics_service.get_student_performance_summary(db, student_id)
        weak_topics = [item["topic"] for item in perf_summary["weak_topics"]]
        strong_topics = [item["topic"] for item in perf_summary["strong_topics"]]

        performance_context = {
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "avg_score": perf_summary["average_score_percentage"],
            "total_quizzes": perf_summary["total_quizzes_taken"]
        }

        # Step 3: Classify Intent & Action Category
        action_type, rationale, intent = self._classify_action(
            message=message,
            weak_topics=weak_topics,
            action_override=action_override
        )

        # Step 4: Knowledge Base Retrieval (RAG)
        retrieved_passages = []
        # Query knowledge base for concept explanation, doubts, summaries, and resources
        if action_type in [
            "explain_concept", "clarify_doubt", "summarize_material",
            "recommend_learning_resources", "suggest_revision_weak_topic"
        ]:
            retrieved_passages = retrieval_engine.search_relevant_chunks(
                db=db,
                query=message,
                student_id=student_id,
                top_k=2,
                threshold=0.08
            )

        # Timing measurement
        start_time = datetime.now()

        # Step 5: Invoke LLM or Fallback Service
        tool_executed = f"tool_{action_type}"
        llm_result = llm_service.generate_response(
            prompt=message,
            student_profile=profile_data,
            action_type=action_type,
            context_passages=retrieved_passages,
            performance_context=performance_context
        )

        elapsed_ms = round((datetime.now() - start_time).total_seconds() * 1000, 2)
        response_text = llm_result["text"]
        provider = llm_result["provider"]
        is_fallback = llm_result["is_fallback"]

        # Formulate recommended next step based on action and weak areas
        if action_type == "suggest_revision_weak_topic" and weak_topics:
            rec_next = f"Complete a 5-question diagnostic quiz on {weak_topics[0]} to verify retention"
        elif action_type == "create_study_plan":
            rec_next = "Activate this plan in the Study Planner module and complete Day 1 tasks"
        elif action_type == "generate_practice_questions":
            rec_next = "Attempt questions in the Quiz & Practice module for instant backend scoring"
        else:
            rec_next = f"Practice active recall with a short quiz on {profile_data.get('areas_of_interest', ['this topic'])[0] if profile_data.get('areas_of_interest') else 'this topic'}"

        # Step 6: Format Agent Decision metadata (for AI Agent Activity Panel)
        agent_decision = {
            "action_type": action_type,
            "intent": intent,
            "rationale": rationale,
            "tool_executed": tool_executed,
            "provider": provider,
            "is_fallback": is_fallback,
            "learner_context_used": {
                "skill_level": profile_data["current_skill_level"],
                "learning_style": profile_data["preferred_learning_style"],
                "identified_weak_topics": weak_topics,
                "recent_quiz_count": performance_context["total_quizzes"],
            },
            "retrieved_sources": [
                {
                    "document_id": p["document_id"],
                    "filename": p["filename"],
                    "page_number": p["page_number"],
                    "score": p.get("score", 0.0),
                }
                for p in retrieved_passages
            ],
            "recommended_next_step": rec_next,
            "response_time_ms": elapsed_ms,
        }

        # Step 7: Manage Conversation & ChatMessage persistence
        if not conversation_id:
            conv_title = message[:35] + ("..." if len(message) > 35 else "")
            conversation = Conversation(student_id=student_id, title=conv_title)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            conv_id = conversation.id
        else:
            conv_id = conversation_id
            conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
            if conversation:
                conversation.updated_at = datetime.utcnow()
                db.commit()

        # Save User Message
        user_msg = ChatMessage(
            conversation_id=conv_id,
            sender="user",
            content=message,
            agent_action="{}",
            sources_json="[]"
        )
        db.add(user_msg)

        # Build citations
        sources_list = [
            {
                "document_id": p["document_id"],
                "filename": p["filename"],
                "page_number": p["page_number"],
                "excerpt": p["text"][:200]
            }
            for p in retrieved_passages
        ]

        # Save Assistant Message
        assistant_msg = ChatMessage(
            conversation_id=conv_id,
            sender="assistant",
            content=response_text,
            agent_action=json.dumps(agent_decision),
            sources_json=json.dumps(sources_list)
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)

        # Step 8: Record Learning Activity
        activity_title = f"AI Agent: {intent}"
        activity = LearningActivity(
            student_id=student_id,
            activity_type=f"agent_{action_type}",
            title=activity_title,
            description=f"Action: {action_type}. {rationale}",
            timestamp=datetime.utcnow(),
            metadata_json=json.dumps({
                "conversation_id": conv_id,
                "message_id": assistant_msg.id,
                "action_type": action_type
            })
        )
        db.add(activity)

        # Proactively recommend practice if revising weak topic
        if action_type == "suggest_revision_weak_topic" and weak_topics:
            rec_topic = weak_topics[0]
            existing_rec = db.query(Recommendation).filter(
                Recommendation.student_id == student_id,
                Recommendation.topic == rec_topic,
                Recommendation.is_completed == False
            ).first()
            if not existing_rec:
                new_rec = Recommendation(
                    student_id=student_id,
                    topic=rec_topic,
                    title=f"Reinforce {rec_topic} with Practice",
                    reason=f"Discussed {rec_topic} with AI Agent. Time to test mastery.",
                    suggested_action="Take a 5-question practice quiz",
                    priority="High"
                )
                db.add(new_rec)

        db.commit()

        # Generate intelligent follow-up prompt chips
        followups = self._generate_followups(action_type, message, weak_topics)

        return {
            "conversation_id": conv_id,
            "message_id": assistant_msg.id,
            "content": response_text,
            "agent_decision": agent_decision,
            "sources": sources_list,
            "suggested_followups": followups
        }

    def _classify_action(
        self,
        message: str,
        weak_topics: List[str],
        action_override: Optional[str] = None
    ) -> tuple[str, str, str]:
        """
        Deterministic intent classifier & decision logic.
        """
        if action_override:
            action_map = {
                "explain_concept": ("explain_concept", "Manual override: Pedagogical concept breakdown", "Explain Concept"),
                "clarify_doubt": ("clarify_doubt", "Manual override: Targeted doubt resolution", "Clarify Doubt"),
                "summarize_material": ("summarize_material", "Manual override: Synthesis of core material", "Summarize Material"),
                "create_study_plan": ("create_study_plan", "Manual override: Customized revision schedule", "Create Study Plan"),
                "generate_practice_questions": ("generate_practice_questions", "Manual override: Problem-solving assessment", "Generate Practice Questions"),
                "recommend_learning_resources": ("recommend_learning_resources", "Manual override: Resource curation", "Recommend Resources"),
                "suggest_revision_weak_topic": ("suggest_revision_weak_topic", "Manual override: Targeted weak topic remediation", "Revise Weak Topic")
            }
            if action_override in action_map:
                return action_map[action_override]

        msg_lower = message.lower()

        # Check weak topics relevance
        for wt in weak_topics:
            if wt.lower() in msg_lower:
                return (
                    "suggest_revision_weak_topic",
                    f"Student is querying '{wt}', which is flagged as an active weak area in recent quizzes. Prioritizing remediation.",
                    f"Remediate Weak Topic: {wt}"
                )

        if any(term in msg_lower for term in ["study plan", "schedule", "routine", "roadmap", "how should i prepare"]):
            return (
                "create_study_plan",
                "Request detected for structured study planning and time management.",
                "Generate Personalized Study Plan"
            )

        if any(term in msg_lower for term in ["practice", "questions", "exercise", "test me", "problems", "quiz"]):
            return (
                "generate_practice_questions",
                "Request detected for active recall problems and practice questions.",
                "Generate Practice Problems"
            )

        if any(term in msg_lower for term in ["summarize", "summary", "tldr", "briefly explain", "in short"]):
            return (
                "summarize_material",
                "Request detected for concise synthesis of academic material.",
                "Summarize Academic Material"
            )

        if any(term in msg_lower for term in ["resource", "textbook", "reference", "link", "where can i read", "video"]):
            return (
                "recommend_learning_resources",
                "Request detected for external and syllabus learning materials.",
                "Recommend Curated Resources"
            )

        if any(term in msg_lower for term in ["why does", "i don't understand", "doubt", "confusion", "difference between", "how come"]):
            return (
                "clarify_doubt",
                "Targeted doubt or comparison detected. Providing analytical clarification.",
                "Clarify Conceptual Doubt"
            )

        # Default pedagogical action
        return (
            "explain_concept",
            "General educational query detected. Providing structured conceptual breakdown aligned with skill level.",
            "Explain Academic Concept"
        )

    def _generate_followups(self, action_type: str, message: str, weak_topics: List[str]) -> List[str]:
        """Provides relevant one-click prompt pills for seamless learning flow."""
        if action_type == "explain_concept":
            return [
                "Can you give a practical numerical example?",
                "What are the common exam pitfalls for this?",
                "Generate 3 practice questions on this topic."
            ]
        elif action_type == "suggest_revision_weak_topic":
            return [
                "Take me through a step-by-step example.",
                "Create a 3-day recovery study plan for this.",
                "Give me 2 practice problems to verify my understanding."
            ]
        elif action_type == "create_study_plan":
            return [
                "How do I allocate time between theory and coding?",
                "What are the highest-yield topics for finals?",
                "Generate practice questions for Day 1."
            ]
        elif action_type == "generate_practice_questions":
            return [
                "Show detailed solution for Problem 1.",
                "Give me a harder question.",
                "Explain the theoretical intuition again."
            ]
        else:
            return [
                "Explain with an analogy.",
                "Create a practice quiz for this.",
                "How does this relate to real-world applications?"
            ]

agent_orchestrator = AIAgentOrchestrator()
