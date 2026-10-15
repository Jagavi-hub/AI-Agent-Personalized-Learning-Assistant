import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    Student, Conversation, ChatMessage, LearningActivity,
    Recommendation, KnowledgeDocument, DocumentChunk,
    Subject, QuizAttempt, Quiz, StudyPlan, StudyTask, LearningGoal
)
from app.services.llm_service import llm_service
from app.retrieval.engine import retrieval_engine
from app.services.analytics_service import analytics_service
from app.services.quiz_service import quiz_service
from app.services.planner_service import planner_service

# Strict Security Whitelists
ALLOWED_ACTIONS = {
    "explain_concept",
    "simplify_concept",
    "generate_quiz",
    "revise_weak_topic",
    "create_study_plan",
    "notes_qa",
    "recommend_resources"
}

ALLOWED_TOOLS = {
    "tool_explain_concept",
    "tool_simplify_concept",
    "tool_generate_quiz",
    "tool_revise_weak_topic",
    "tool_create_study_plan",
    "tool_notes_qa",
    "tool_recommend_resources"
}

ACTION_ALIASES = {
    "clarify_doubt": "simplify_concept",
    "concept_simplification": "simplify_concept",
    "generate_practice_questions": "generate_quiz",
    "quiz_generation": "generate_quiz",
    "suggest_revision_weak_topic": "revise_weak_topic",
    "revision": "revise_weak_topic",
    "summarize_material": "notes_qa",
    "answer_from_notes": "notes_qa",
    "recommend_learning_resources": "recommend_resources",
    "learning_recommendations": "recommend_resources",
    "explanation": "explain_concept",
    "study_planning": "create_study_plan",
    "study_plan": "create_study_plan",
    "practice": "generate_quiz",
    "quiz": "generate_quiz"
}

class AIAgentOrchestrator:
    """
    Dedicated AI Agent Orchestrator for LearnAI.
    Coordinates student profile context, historical performance metrics,
    knowledge base RAG, tool calling, service routing, and transparent reasoning.
    """

    def process_student_request(
        self,
        db: Session,
        student_id: int,
        message: str,
        conversation_id: Optional[int] = None,
        action_override: Optional[str] = None,
        subject_id: Optional[int] = None,
        subject_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main Agent Execution Lifecycle:
        1. Load student profile & learning history.
        2. Detect active subject context.
        3. Retrieve quiz results & known weak areas.
        4. Classify requirement & select tool/action (LLM or reliable rule-based fallback).
        5. Retrieve knowledge base context (RAG) when relevant.
        6. Validate tool permissions & execute routed service.
        7. Record student-owned conversation, chat message, and learning activity.
        8. Return structured output with transparent agent decision metadata.
        """

        # Step 1: Load student profile
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError(f"Student with id {student_id} not found.")

        profile_data = {
            "name": student.name or "Student",
            "department": student.department or "AI & Data Science (AI&DS)",
            "year": student.year or "3rd Year",
            "semester": student.semester or "6th Semester",
            "current_skill_level": student.current_skill_level or "Intermediate",
            "preferred_learning_style": student.preferred_learning_style or "Visual & Practical",
            "learning_goals": json.loads(student.learning_goals) if student.learning_goals else [],
            "areas_of_interest": json.loads(student.areas_of_interest) if student.areas_of_interest else [],
            "enrolled_subjects": json.loads(student.enrolled_subjects) if student.enrolled_subjects else []
        }

        # Step 2: Detect Active Subject Context
        subject_info = self._resolve_subject_context(db, message, subject_id, subject_code, profile_data)

        # Step 3: Retrieve learning history & performance metrics
        perf_summary = analytics_service.get_student_performance_summary(db, student_id)
        weak_topics = [item["topic"] for item in perf_summary["weak_topics"]]
        strong_topics = [item["topic"] for item in perf_summary["strong_topics"]]

        # Recent quiz attempts
        recent_attempts = db.query(QuizAttempt, Quiz).join(
            Quiz, QuizAttempt.quiz_id == Quiz.id
        ).filter(
            QuizAttempt.student_id == student_id
        ).order_by(QuizAttempt.completed_at.desc()).limit(5).all()

        recent_quizzes_summary = [
            {
                "topic": q.topic,
                "score": att.score,
                "total": att.total_questions,
                "percentage": att.percentage
            }
            for att, q in recent_attempts
        ]

        # Active study plan check
        active_plan = db.query(StudyPlan).filter(
            StudyPlan.student_id == student_id,
            StudyPlan.is_active == True
        ).first()

        performance_context = {
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "avg_score": perf_summary.get("average_score_percentage", 0.0),
            "total_quizzes": perf_summary.get("total_quizzes_taken", 0),
            "recent_quizzes": recent_quizzes_summary,
            "selected_subject": subject_info.get("name") if subject_info else "Core Curriculum"
        }

        relevant_student_context = {
            "skill_level": profile_data["current_skill_level"],
            "learning_style": profile_data["preferred_learning_style"],
            "subject": f"{subject_info['code']}: {subject_info['name']}" if subject_info else "Core Curriculum",
            "identified_weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "recent_quiz_count": len(recent_attempts),
            "avg_quiz_score": perf_summary.get("average_score_percentage", 0.0),
            "active_goals": profile_data.get("learning_goals", []),
            "has_active_study_plan": active_plan is not None
        }

        # Step 4: Classify Intent & Action Category
        action_type = None
        rationale = None
        intent = None

        if action_override:
            norm_action = self._normalize_action(action_override)
            if norm_action and norm_action in ALLOWED_ACTIONS:
                action_type = norm_action
                rationale, intent = self._get_override_description(norm_action, message, weak_topics)
            else:
                # Security: Reject arbitrary actions and safely fall back
                print(f"[AIAgentOrchestrator] Security: Arbitrary action_override '{action_override}' blocked. Using classification.")
                action_type, rationale, intent = self._classify_action(
                    message=message,
                    weak_topics=weak_topics,
                    subject_info=subject_info
                )
        else:
            # Try structured LLM classification if Gemini is configured
            llm_decision = llm_service.classify_intent_with_llm(
                prompt=message,
                student_profile=profile_data,
                weak_topics=weak_topics,
                subject_info=subject_info
            )
            if llm_decision and llm_decision.get("action_type") in ALLOWED_ACTIONS:
                action_type = llm_decision["action_type"]
                rationale = llm_decision.get("rationale", "Structured AI Agent intent analysis.")
                intent = llm_decision.get("intent", f"AI Action: {action_type.replace('_', ' ').title()}")
            else:
                # Reliable rule-based classification fallback
                action_type, rationale, intent = self._classify_action(
                    message=message,
                    weak_topics=weak_topics,
                    subject_info=subject_info
                )

        # Step 5: Knowledge Base Retrieval (RAG) for Course-Specific Grounding
        retrieved_passages = []
        if action_type in [
            "explain_concept", "simplify_concept", "notes_qa",
            "revise_weak_topic", "recommend_resources"
        ]:
            active_subj_id = subject_info.get("id") if subject_info else None
            retrieved_passages = retrieval_engine.search_relevant_chunks(
                db=db,
                query=message,
                student_id=student_id,
                top_k=3,
                threshold=0.05,
                subject_id=active_subj_id
            )

        # Step 3b: Load recent conversation history for multi-turn conversational context
        conversation_history = []
        if conversation_id:
            past_msgs = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conversation_id
            ).order_by(ChatMessage.timestamp.asc()).all()
            for m in past_msgs[-8:]:
                conversation_history.append({"sender": m.sender, "content": m.content})

        # Timing measurement
        start_time = datetime.now()

        # Step 6: Validate Tool Execution & Route to Backend Service
        tool_executed = f"tool_{action_type}"
        if tool_executed not in ALLOWED_TOOLS:
            tool_executed = "tool_explain_concept"
            action_type = "explain_concept"

        execution_result = self._execute_tool(
            db=db,
            student_id=student_id,
            action_type=action_type,
            message=message,
            profile_data=profile_data,
            retrieved_passages=retrieved_passages,
            performance_context=performance_context,
            subject_info=subject_info,
            conversation_history=conversation_history
        )

        elapsed_ms = round((datetime.now() - start_time).total_seconds() * 1000, 2)
        response_text = execution_result["text"]
        provider = execution_result["provider"]
        is_fallback = execution_result["is_fallback"]
        service_routing = execution_result.get("service_routing", {
            "service": "AcademicLLMService",
            "status": "success",
            "details": f"Processed via {provider}"
        })

        # Formulate recommended next step based on action, weak topics, and active subject
        if action_type in ["revise_weak_topic", "suggest_revision_weak_topic"] and weak_topics:
            rec_next = f"Complete a 5-question diagnostic quiz on {weak_topics[0]} to verify retention"
        elif action_type == "create_study_plan":
            rec_next = "Activate this plan in the Study Planner module and complete Day 1 milestones"
        elif action_type in ["generate_quiz", "generate_practice_questions"]:
            rec_next = "Attempt these questions in the Quiz & Practice module for instant backend scoring"
        elif action_type == "notes_qa":
            rec_next = "Upload additional lecture slides to expand your Course Knowledge Base"
        elif action_type == "simplify_concept":
            rec_next = "Verify your conceptual understanding with a numerical or coding practice problem"
        elif action_type == "recommend_resources":
            rec_next = "Review the prioritized textbook chapters and video derivations logged in your Recommendations"
        else:
            rec_next = f"Practice active recall with a short quiz on {subject_info.get('name', 'this subject')}"

        # Step 7: Format Transparent Agent Decision metadata (for Activity Panel)
        agent_decision = {
            "action_type": action_type,
            "intent": intent,
            "detected_intent": intent,
            "rationale": rationale,
            "action_reason": rationale,
            "selected_action": action_type,
            "tool_executed": tool_executed,
            "provider": provider,
            "is_fallback": is_fallback,
            "learner_context_used": relevant_student_context,
            "relevant_student_context": relevant_student_context,
            "service_routing": service_routing,
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

        # Step 8: Manage Conversation & ChatMessage persistence with strict ownership
        conv_id = self._ensure_student_conversation(db, student_id, conversation_id, message)

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

        # Step 9: Record Learning Activity
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

        # Proactively persist a Recommendation if revising weak topic or recommending resources
        if action_type in ["revise_weak_topic", "suggest_revision_weak_topic"] and weak_topics:
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
                    reason=f"Discussed {rec_topic} with AI Agent. Recommended 5-question review.",
                    suggested_action="Take a 5-question practice quiz",
                    priority="High"
                )
                db.add(new_rec)

        db.commit()

        # Generate intelligent follow-up prompt chips
        followups = self._generate_followups(action_type, message, weak_topics, subject_info)

        return {
            "conversation_id": conv_id,
            "message_id": assistant_msg.id,
            "content": response_text,
            "agent_decision": agent_decision,
            "sources": sources_list,
            "suggested_followups": followups
        }

    def _resolve_subject_context(
        self,
        db: Session,
        message: str,
        subject_id: Optional[int],
        subject_code: Optional[str],
        profile_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolves active subject context from request params, message scan, or student profile."""
        all_subjects = db.query(Subject).all()
        if not all_subjects:
            return {"id": 1, "code": "22AI503", "name": "Machine Learning"}

        if subject_id:
            subj = next((s for s in all_subjects if s.id == subject_id), None)
            if subj:
                return {"id": subj.id, "code": subj.code, "name": subj.name}

        if subject_code:
            subj = next((s for s in all_subjects if s.code.upper() == subject_code.upper()), None)
            if subj:
                return {"id": subj.id, "code": subj.code, "name": subj.name}

        # Check message content for subject code or title
        msg_upper = message.upper()
        for subj in all_subjects:
            if subj.code.upper() in msg_upper or subj.name.lower() in message.lower():
                return {"id": subj.id, "code": subj.code, "name": subj.name}

        # Check domain keywords for the four academic courses
        msg_l = message.lower()
        if any(k in msg_l for k in ["tcp", "udp", "ip address", "latency", "bandwidth", "topology", "packet", "router", "lan", "wan", "duplex", "mesh topology", "osi model"]):
            cn_subj = next((s for s in all_subjects if "network" in s.name.lower() or "22cs502" in s.code.lower()), None)
            if cn_subj:
                return {"id": cn_subj.id, "code": cn_subj.code, "name": cn_subj.name}

        if any(k in msg_l for k in ["cloud", "nist", "iaas", "paas", "saas", "virtualization", "elasticity", "public cloud", "private cloud"]):
            cc_subj = next((s for s in all_subjects if "cloud" in s.name.lower() or "22it402" in s.code.lower()), None)
            if cc_subj:
                return {"id": cc_subj.id, "code": cc_subj.code, "name": cc_subj.name}

        if any(k in msg_l for k in ["turing test", "rational agent", "peas", "reflex agent", "heuristic", "laws of thought", "artificial intelligence"]):
            ai_subj = next((s for s in all_subjects if "artificial" in s.name.lower() or "21cb603" in s.code.lower()), None)
            if ai_subj:
                return {"id": ai_subj.id, "code": ai_subj.code, "name": ai_subj.name}

        if any(k in msg_l for k in ["supervised", "unsupervised", "reinforcement learning", "gradient descent", "overfitting", "underfitting", "machine learning", "tom mitchell", "checkers"]):
            ml_subj = next((s for s in all_subjects if "machine" in s.name.lower() or "22ai503" in s.code.lower()), None)
            if ml_subj:
                return {"id": ml_subj.id, "code": ml_subj.code, "name": ml_subj.name}

        # Fallback to student's enrolled subjects
        enrolled = profile_data.get("enrolled_subjects", [])
        if enrolled:
            for s_name in enrolled:
                subj = next((s for s in all_subjects if s.name.lower() in s_name.lower()), None)
                if subj:
                    return {"id": subj.id, "code": subj.code, "name": subj.name}

        # Final default: first subject in database
        first_s = all_subjects[0]
        return {"id": first_s.id, "code": first_s.code, "name": first_s.name}

    def _ensure_student_conversation(
        self,
        db: Session,
        student_id: int,
        conversation_id: Optional[int],
        message: str
    ) -> int:
        """Enforces student ownership of conversation thread."""
        if not conversation_id:
            conv_title = message[:35] + ("..." if len(message) > 35 else "")
            conversation = Conversation(student_id=student_id, title=conv_title)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            return conversation.id

        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.student_id == student_id
        ).first()

        if conversation:
            conversation.updated_at = datetime.utcnow()
            db.commit()
            return conversation.id
        else:
            # Scoped isolation: if conversation belongs to another student, create a separate student-owned thread
            conv_title = message[:35] + ("..." if len(message) > 35 else "")
            conversation = Conversation(student_id=student_id, title=conv_title)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            return conversation.id

    def _normalize_action(self, action: Optional[str]) -> Optional[str]:
        if not action:
            return None
        cleaned = action.strip().lower()
        return ACTION_ALIASES.get(cleaned, cleaned)

    def _get_override_description(self, action_type: str, message: str, weak_topics: List[str]) -> tuple[str, str]:
        descriptions = {
            "explain_concept": ("Manual override: Structured pedagogical concept breakdown aligned with skill level.", "Explain Concept"),
            "simplify_concept": ("Manual override: Conceptual analogy and intuitive beginner breakdown.", "Simplify Concept"),
            "generate_quiz": ("Manual override: Problem-solving assessment and diagnostic quiz generation.", "Generate Practice Quiz"),
            "revise_weak_topic": ("Manual override: Targeted remediation for diagnosed academic weak area.", "Revise Weak Topic"),
            "create_study_plan": ("Manual override: Structured 7-day revision schedule with daily milestones.", "Create Study Plan"),
            "notes_qa": ("Manual override: Courseware notes synthesis and Knowledge Base Q&A.", "Notes Q&A (RAG)"),
            "recommend_resources": ("Manual override: Curated academic references, textbooks, and video lectures.", "Recommend Resources")
        }
        return descriptions.get(action_type, ("Manual override: Pedagogical assistance.", "Academic Learning Action"))

    def _classify_action(
        self,
        message: str,
        weak_topics: List[str],
        subject_info: Optional[Dict[str, Any]] = None
    ) -> tuple[str, str, str]:
        """
        Deterministic intent classifier & decision logic with rule-based fallback.
        Reliably maps user query to 1 of 7 educational actions.
        """
        msg_lower = message.lower()

        # 1. Weak Topic Remediation
        for wt in weak_topics:
            if wt.lower() in msg_lower:
                return (
                    "revise_weak_topic",
                    f"Student is querying '{wt}', flagged as a weak area in recent quizzes. Prioritizing targeted remediation.",
                    f"Remediate Weak Topic: {wt}"
                )

        if any(term in msg_lower for term in ["revise my weak", "weak area", "struggling with", "where did i go wrong", "my mistakes"]):
            focus = weak_topics[0] if weak_topics else "Diagnostic Area"
            return (
                "revise_weak_topic",
                f"Student requested remediation for identified weak topics ({focus}).",
                f"Remediate Weak Topic: {focus}"
            )

        # 2. Concept Simplification / Intuitive Analogies
        if any(term in msg_lower for term in [
            "simplify", "simple explanation", "analogy", "in plain english",
            "like i'm 5", "eli5", "beginner terms", "simple terms", "intuitive intuition"
        ]):
            return (
                "simplify_concept",
                "Request detected for intuitive breakdown and conceptual analogies without heavy jargon.",
                "Simplify Academic Concept"
            )

        # 3. Study Planning
        if any(term in msg_lower for term in ["study plan", "schedule", "routine", "roadmap", "how should i prepare", "exam sprint"]):
            return (
                "create_study_plan",
                "Request detected for structured study planning and time management milestones.",
                "Generate Personalized Study Plan"
            )

        # 4. Quiz & Practice Generation
        if any(term in msg_lower for term in ["quiz", "practice", "test me", "problems", "exercise", "question bank", "mock questions"]):
            return (
                "generate_quiz",
                "Request detected for active recall problems and interactive quiz assessment.",
                "Generate Practice Problems"
            )

        # 5. Course Notes Q&A (RAG)
        if any(term in msg_lower for term in [
            "notes", "lecture notes", "slides", "syllabus", "from my notes",
            "summarize notes", "course material", "uploaded file", "in our syllabus"
        ]):
            return (
                "notes_qa",
                "Request detected explicitly referencing course notes or uploaded syllabus materials.",
                "Question Answering from Notes"
            )

        # 6. Learning Recommendations
        if any(term in msg_lower for term in ["resource", "textbook", "reference", "link", "where can i read", "video lectures", "books"]):
            return (
                "recommend_resources",
                "Request detected for external and syllabus learning materials.",
                "Recommend Curated Resources"
            )

        # 7. Doubt Clarification (Maps to Concept Simplification)
        if any(term in msg_lower for term in ["why does", "i don't understand", "doubt", "confusion", "difference between", "how come"]):
            return (
                "simplify_concept",
                "Targeted doubt or conceptual comparison detected. Providing analytical clarification.",
                "Clarify Conceptual Doubt"
            )

        # Default pedagogical action: In-depth Academic Explanation
        return (
            "explain_concept",
            "General educational query detected. Providing structured conceptual breakdown aligned with skill level.",
            "Explain Academic Concept"
        )

    def _execute_tool(
        self,
        db: Session,
        student_id: int,
        action_type: str,
        message: str,
        profile_data: Dict[str, Any],
        retrieved_passages: List[Dict[str, Any]],
        performance_context: Dict[str, Any],
        subject_info: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Dispatch to explicit, validated tool functions and route to appropriate backend services."""
        tool_dispatch = {
            "explain_concept": self.tool_explain_concept,
            "simplify_concept": self.tool_simplify_concept,
            "generate_quiz": self.tool_generate_quiz,
            "revise_weak_topic": self.tool_revise_weak_topic,
            "create_study_plan": self.tool_create_study_plan,
            "notes_qa": self.tool_notes_qa,
            "recommend_resources": self.tool_recommend_resources,
            # Legacy aliases
            "clarify_doubt": self.tool_simplify_concept,
            "generate_practice_questions": self.tool_generate_quiz,
            "suggest_revision_weak_topic": self.tool_revise_weak_topic,
            "summarize_material": self.tool_notes_qa,
            "recommend_learning_resources": self.tool_recommend_resources,
        }
        tool_fn = tool_dispatch.get(action_type, self.tool_explain_concept)
        return tool_fn(
            db=db,
            student_id=student_id,
            prompt=message,
            profile=profile_data,
            passages=retrieved_passages,
            perf=performance_context,
            subject=subject_info,
            conversation_history=conversation_history
        )

    def tool_explain_concept(
        self, db: Session, student_id: int, prompt: str, profile: Dict[str, Any],
        passages: List[Dict[str, Any]], perf: Dict[str, Any], subject: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        res = llm_service.generate_response(prompt, profile, "explain_concept", passages, perf, conversation_history)
        res["service_routing"] = {
            "service": "AcademicLLMService & RetrievalEngine",
            "status": "success",
            "retrieved_chunks": len(passages)
        }
        return res

    def tool_simplify_concept(
        self, db: Session, student_id: int, prompt: str, profile: Dict[str, Any],
        passages: List[Dict[str, Any]], perf: Dict[str, Any], subject: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        res = llm_service.generate_response(prompt, profile, "simplify_concept", passages, perf, conversation_history)
        res["service_routing"] = {
            "service": "AcademicLLMService (Simplification Engine)",
            "status": "success",
            "analogy_mode": True
        }
        return res

    def tool_generate_quiz(
        self, db: Session, student_id: int, prompt: str, profile: Dict[str, Any],
        passages: List[Dict[str, Any]], perf: Dict[str, Any], subject: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        """Routes directly to QuizService to create real DB Quiz entities and return preview."""
        subj_name = subject.get("name", "Machine Learning") if subject else "Machine Learning"
        topic = subj_name
        msg_l = prompt.lower()
        if "network" in msg_l or "delay" in msg_l or "packet" in msg_l or "tcp" in msg_l:
            topic = "Computer Networks"
        elif "cloud" in msg_l or "iaas" in msg_l or "saas" in msg_l or "virtualization" in msg_l:
            topic = "Cloud Computing"
        elif "turing" in msg_l or "rational agent" in msg_l or "ai" in msg_l:
            topic = "Artificial Intelligence"
        elif "checkers" in msg_l or "mitchell" in msg_l or "lms" in msg_l or "machine learning" in msg_l:
            topic = "Machine Learning"
        elif perf.get("weak_topics"):
            topic = perf["weak_topics"][0]

        try:
            quiz = quiz_service.generate_quiz(
                db=db,
                student_id=student_id,
                topic=topic,
                difficulty=profile.get("current_skill_level", "Intermediate"),
                num_questions=3,
                subject_id=subject.get("id") if subject else None
            )

            # Build rich Markdown preview
            questions_md = ""
            for idx, q in enumerate(quiz.questions, 1):
                questions_md += f"""
#### Question {idx}: {q.question_text}
* **A)** {q.option_a}
* **B)** {q.option_b}
* **C)** {q.option_c}
* **D)** {q.option_d}
"""
            content = f"""### 📝 Practice Assessment Generated: {quiz.topic}

I have routed your request to the **LearnAI Quiz Engine** and generated an authentic **3-question assessment** tailored to your **{profile.get('current_skill_level', 'Intermediate')}** level, strictly grounded in **{subj_name}** materials.

---
{questions_md}
---
🎯 **Active Verification:**
This quiz (ID **#{quiz.id}**) is now active in your student account! You can attempt it with real-time scoring and analytics tracking in the **Quiz & Practice** tab.
"""
            return {
                "text": content,
                "provider": "LearnAI Quiz Service (Autonomous Generation)",
                "is_fallback": False,
                "service_routing": {
                    "service": "QuizService",
                    "status": "success",
                    "quiz_id": quiz.id,
                    "num_questions": len(quiz.questions)
                }
            }
        except Exception as e:
            fallback_res = llm_service.generate_response(prompt, profile, "generate_quiz", passages, perf, conversation_history)
            fallback_res["service_routing"] = {
                "service": "QuizService",
                "status": "fallback",
                "error": str(e)
            }
            return fallback_res

    def tool_revise_weak_topic(
        self, db: Session, student_id: int, prompt: str, profile: Dict[str, Any],
        passages: List[Dict[str, Any]], perf: Dict[str, Any], subject: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        res = llm_service.generate_response(prompt, profile, "revise_weak_topic", passages, perf, conversation_history)
        weak_focus = perf.get("weak_topics", ["Identified Revision Area"])[0] if perf.get("weak_topics") else "Identified Revision Area"
        res["service_routing"] = {
            "service": "AnalyticsService & RemediationEngine",
            "status": "success",
            "weak_topic": weak_focus
        }
        return res

    def tool_create_study_plan(
        self, db: Session, student_id: int, prompt: str, profile: Dict[str, Any],
        passages: List[Dict[str, Any]], perf: Dict[str, Any], subject: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        """Routes directly to StudyPlannerService to create real DB StudyPlan records."""
        subj_name = subject.get("name", "Machine Learning") if subject else "Machine Learning"
        try:
            plan = planner_service.generate_plan(
                db=db,
                student_id=student_id,
                title=f"Adaptive Sprint: {subj_name}",
                subject=subj_name,
                target_date="Next Week",
                available_hours_per_week=12,
                focus_weak_topics=True
            )

            tasks_md = ""
            for t in plan.tasks[:4]:
                tasks_md += f"* **{t.day_of_week}:** {t.task_description} *({t.estimated_minutes} mins)*\n"

            content = f"""### 📅 Structured Adaptive Study Plan Generated: {subj_name}

I have routed your request to the **Study Planner Service** and created an active 7-day milestone schedule targeting your diagnosed weak areas.

---

#### 🎯 Upcoming Milestones:
{tasks_md}
* ... *(plus 3 additional weekend mastery & diagnostic tasks)*

---
🚀 **Next Step:** This plan has been activated in your **Study Planner** tab (Plan ID **#{plan.id}**). You can mark tasks complete as you progress!"""

            return {
                "text": content,
                "provider": "LearnAI Study Planner Service",
                "is_fallback": False,
                "service_routing": {
                    "service": "StudyPlannerService",
                    "status": "success",
                    "plan_id": plan.id,
                    "total_tasks": len(plan.tasks)
                }
            }
        except Exception as e:
            fallback_res = llm_service.generate_response(prompt, profile, "create_study_plan", passages, perf, conversation_history)
            fallback_res["service_routing"] = {
                "service": "StudyPlannerService",
                "status": "fallback",
                "error": str(e)
            }
            return fallback_res

    def tool_notes_qa(
        self, db: Session, student_id: int, prompt: str, profile: Dict[str, Any],
        passages: List[Dict[str, Any]], perf: Dict[str, Any], subject: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        course_name = subject.get("name") if subject else "this course"
        if not passages:
            return {
                "text": f"### 📖 Course Notes Search: {course_name}\n\nNo relevant passages directly matching your query were found in the uploaded academic materials for **{course_name}**. Please verify your question or upload relevant notes to the Knowledge Base.",
                "provider": "KnowledgeRetrievalEngine (RAG)",
                "is_fallback": True,
                "service_routing": {
                    "service": "KnowledgeRetrievalEngine (RAG)",
                    "status": "fallback",
                    "detail": "no_chunks_found",
                    "matched_documents": 0,
                    "course": course_name
                }
            }
        res = llm_service.generate_response(prompt, profile, "notes_qa", passages, perf, conversation_history)
        res["service_routing"] = {
            "service": "KnowledgeRetrievalEngine (RAG)",
            "status": "success",
            "matched_documents": len(passages),
            "course": course_name
        }
        return res

    def tool_recommend_resources(
        self, db: Session, student_id: int, prompt: str, profile: Dict[str, Any],
        passages: List[Dict[str, Any]], perf: Dict[str, Any], subject: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None, **kwargs
    ) -> Dict[str, Any]:
        res = llm_service.generate_response(prompt, profile, "recommend_resources", passages, perf, conversation_history)
        res["service_routing"] = {
            "service": "RecommendationEngine & KnowledgeBase",
            "status": "success",
            "persisted_recommendation": True
        }
        return res

    def _generate_followups(
        self,
        action_type: str,
        message: str,
        weak_topics: List[str],
        subject_info: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Provides relevant one-click prompt pills for seamless learning flow."""
        if action_type == "explain_concept":
            return [
                "Can you simplify this with an intuitive analogy?",
                "What are the common exam pitfalls for this?",
                "Generate a 3-question practice quiz on this topic."
            ]
        elif action_type == "simplify_concept":
            return [
                "Can you give a practical numerical example?",
                "What is the mathematical derivation for this?",
                "Test my understanding with 2 practice problems."
            ]
        elif action_type in ["revise_weak_topic", "suggest_revision_weak_topic"]:
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
        elif action_type in ["generate_quiz", "generate_practice_questions"]:
            return [
                "Show detailed step-by-step solutions for these questions.",
                "Give me a harder analytical problem.",
                "Explain the theoretical intuition again."
            ]
        elif action_type == "notes_qa":
            return [
                "What are the most important exam definitions from these notes?",
                "Create a quiz based on these uploaded notes.",
                "Summarize the key trade-offs mentioned in the lecture slides."
            ]
        else:
            return [
                "Explain with an analogy.",
                "Create a practice quiz for this.",
                "How does this relate to real-world applications?"
            ]

agent_orchestrator = AIAgentOrchestrator()
