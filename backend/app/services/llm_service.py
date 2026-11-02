import os
import re
import json
from typing import Dict, Any, List, Optional
from app.core.config import settings

class AcademicLLMService:
    """
    Structured Generative AI service with secure Gemini integration
    and a rich, deterministic academic fallback engine.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.gemini_available = False
        self._init_gemini()

    def _init_gemini(self):
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.genai = genai
                self.gemini_available = True
            except Exception as e:
                print(f"[AcademicLLMService] Could not initialize Gemini: {e}")
                self.gemini_available = False

    def classify_intent_with_llm(
        self,
        prompt: str,
        student_profile: Dict[str, Any],
        weak_topics: List[str],
        subject_info: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Use Gemini to classify the student query into one of the 7 supported educational actions:
        - explain_concept: In-depth pedagogical breakdown of theories, algorithms, formulas
        - simplify_concept: Intuitive explanation, beginner analogy, ELI5, simplified conceptual model
        - generate_quiz: Request for practice questions, active recall problems, diagnostic tests
        - revise_weak_topic: Targeted remediation on diagnosed weak areas or past mistakes
        - create_study_plan: Structured revision schedules, routines, roadmaps, time management
        - notes_qa: Questions directly referencing uploaded course notes, syllabus, or lecture slides
        - recommend_resources: Recommendations for textbooks, reference papers, video lectures, online guides

        Returns validated dictionary with action_type, intent, and rationale, or None on failure/fallback.
        """
        if not self.gemini_available:
            return None
        try:
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
            model = self.genai.GenerativeModel(model_name)
            dept = student_profile.get("department", "Computer Science")
            level = student_profile.get("current_skill_level", "Intermediate")
            subj = subject_info.get("name", "Core Curriculum") if subject_info else "Core Curriculum"
            weak_str = ", ".join(weak_topics) if weak_topics else "None recorded yet"

            classification_prompt = (
                "You are an academic intent classifier for LearnAI, a personalized learning assistant for higher education students.\n"
                f"Student Profile: Dept={dept}, Level={level}, Subject={subj}\n"
                f"Student Weak Topics from Diagnostic History: {weak_str}\n\n"
                "Classify the student query into exactly ONE of the following 7 action categories:\n"
                "1. explain_concept: In-depth pedagogical breakdown of theories, algorithms, architectures, formulas\n"
                "2. simplify_concept: Intuitive explanation, conceptual analogies, ELI5, beginner breakdown\n"
                "3. generate_quiz: Request for practice questions, diagnostic quizzes, problems to test knowledge\n"
                "4. revise_weak_topic: Revision, error correction, or targeted remediation on flagged weak topics\n"
                "5. create_study_plan: Structured study schedules, exam preparation routines, time management, roadmaps\n"
                "6. notes_qa: Questions explicitly referencing or asking about course notes, lecture slides, syllabus\n"
                "7. recommend_resources: Recommendations for textbooks, verified video series, tutorials, reference materials\n\n"
                f"Student Query: \"{prompt}\"\n\n"
                "Respond ONLY with a valid JSON object in this exact format (no markdown fences, no explanatory text):\n"
                "{\"action_type\": \"<category_name>\", \"intent\": \"<2-4 word intent title>\", \"rationale\": \"<one concise sentence explaining why this action was selected>\"}"
            )
            resp = model.generate_content(
                classification_prompt,
                request_options={"timeout": 6.0}
            )
            text = resp.text.strip()
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                raw_action = str(data.get("action_type", "")).strip().lower()

                # Canonical valid actions
                valid_actions = {
                    "explain_concept", "simplify_concept", "generate_quiz",
                    "revise_weak_topic", "create_study_plan", "notes_qa",
                    "recommend_resources"
                }

                # Synonym and legacy alias normalization
                alias_map = {
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
                    "study_planning": "create_study_plan"
                }

                canonical_action = alias_map.get(raw_action, raw_action)
                if canonical_action in valid_actions and data.get("intent") and data.get("rationale"):
                    data["action_type"] = canonical_action
                    return data
                else:
                    print(f"[AcademicLLMService] LLM returned unsupported action_type '{raw_action}'. Falling back to rule-based classifier.")
        except Exception as err:
            print(f"[AcademicLLMService] LLM intent classification failed or timed out: {err}")
        return None

    def generate_quiz_questions(
        self,
        topic: str,
        difficulty: str = "Intermediate",
        num_questions: int = 5,
        course_name: Optional[str] = None,
        context_passages: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Use Gemini to generate structured multiple-choice quiz questions with
        options A-D, correct answer key, and academic explanation, strictly grounded
        in the provided course excerpts.
        Returns a list of validated question dicts, or None on failure/fallback.
        """
        if not self.gemini_available:
            return None
        try:
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
            model = self.genai.GenerativeModel(model_name)

            course_label = course_name or topic
            passages_block = ""
            if context_passages:
                passages_block = "\n\nAUTHENTIC COURSE EXCERPTS (Ground all questions ONLY in these excerpts):\n"
                for i, p in enumerate(context_passages[:6]):
                    passages_block += f"--- Excerpt [{p.get('filename', 'Course Note')}, Page {p.get('page_number', 1)}] ---\n{p.get('text', '')}\n"

            quiz_prompt = (
                f"You are an academic quiz author for higher education students.\n"
                f"Course: {course_label}\n"
                f"Topic: {topic}\n"
                f"Difficulty level: {difficulty}\n"
                f"{passages_block}\n"
                f"Generate exactly {num_questions} multiple-choice questions.\n\n"
                "Requirements:\n"
                "1. Each question must have exactly 4 plausible options labeled option_a, option_b, option_c, option_d.\n"
                "2. There must be exactly one correct answer; correct_option must be 'A', 'B', 'C', or 'D'.\n"
                "3. Provide a clear, rigorous explanation citing the specific academic fact from the course excerpts.\n"
                "4. Output MUST be a valid JSON array of objects without markdown code blocks, backticks, or extraneous text:\n"
                "[\n"
                "  {\n"
                "    \"question_text\": \"Question stem here...\",\n"
                "    \"option_a\": \"Option A text...\",\n"
                "    \"option_b\": \"Option B text...\",\n"
                "    \"option_c\": \"Option C text...\",\n"
                "    \"option_d\": \"Option D text...\",\n"
                "    \"correct_option\": \"A\",\n"
                "    \"explanation\": \"Detailed explanation citing course source...\",\n"
                f"    \"topic\": \"{topic}\"\n"
                "  }\n"
                "]"
            )
            resp = model.generate_content(
                quiz_prompt,
                request_options={"timeout": 12.0}
            )
            text = resp.text.strip()
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                raw_list = json.loads(match.group(0))
                validated = []
                for item in raw_list:
                    if not isinstance(item, dict):
                        continue
                    q_text = str(item.get("question_text", "")).strip()
                    opt_a = str(item.get("option_a", "")).strip()
                    opt_b = str(item.get("option_b", "")).strip()
                    opt_c = str(item.get("option_c", "")).strip()
                    opt_d = str(item.get("option_d", "")).strip()
                    corr = str(item.get("correct_option", "")).strip().upper()
                    expl = str(item.get("explanation", "")).strip()
                    if (q_text and opt_a and opt_b and opt_c and opt_d
                            and corr in {"A", "B", "C", "D"} and expl):
                        validated.append({
                            "question_text": q_text,
                            "option_a": opt_a,
                            "option_b": opt_b,
                            "option_c": opt_c,
                            "option_d": opt_d,
                            "correct_option": corr,
                            "explanation": expl,
                            "topic": item.get("topic", topic)
                        })
                if validated:
                    return validated[:num_questions]
        except Exception as err:
            print(f"[AcademicLLMService] Gemini quiz generation failed: {err}")
        return None

    def generate_response(
        self,
        prompt: str,
        student_profile: Dict[str, Any],
        action_type: str,
        context_passages: List[Dict[str, Any]] = None,
        performance_context: Dict[str, Any] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate academic response. Tries Gemini API if configured; otherwise uses dynamic deterministic RAG synthesizer.
        Supports multi-turn previous conversation context and course isolation.
        """
        context_passages = context_passages or []
        performance_context = performance_context or {}
        conversation_history = conversation_history or []

        # 1. Try Gemini if configured
        if self.gemini_available:
            try:
                gemini_text = self._call_gemini(
                    prompt, student_profile, action_type, context_passages, performance_context, conversation_history, subject_info
                )
                if gemini_text and len(gemini_text.strip()) > 20:
                    return {
                        "text": gemini_text,
                        "provider": "Gemini 1.5 Flash (Live API)",
                        "is_fallback": False
                    }
            except Exception as err:
                print(f"[AcademicLLMService] Gemini call failed, falling back: {err}")

        # 2. Dynamic Course-Grounded Academic Engine (Deterministic Fallback)
        fallback_text = self._generate_academic_fallback(
            prompt, student_profile, action_type, context_passages, performance_context, conversation_history, subject_info
        )
        return {
            "text": fallback_text,
            "provider": "LearnAI Deterministic Academic Engine (Offline Fallback)",
            "is_fallback": True
        }

    def _call_gemini(
        self,
        prompt: str,
        student_profile: Dict[str, Any],
        action_type: str,
        context_passages: List[Dict[str, Any]],
        performance_context: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        student_name = student_profile.get("name", "Student")
        dept = student_profile.get("department", "Computer Science")
        level = student_profile.get("current_skill_level", "Intermediate")
        style = student_profile.get("preferred_learning_style", "Visual & Practical")
        exp_level = student_profile.get("explanation_level", "Detailed")
        ans_format = student_profile.get("preferred_answer_format", "Step-by-step")
        lang = student_profile.get("preferred_language", "English")
        show_citations = student_profile.get("show_pdf_citations", True)
        include_examples = student_profile.get("include_examples", True)
        verbosity = student_profile.get("explanation_verbosity", "Detailed")
        weak_topics = performance_context.get("weak_topics", [])
        
        subj_name = subject_info.get("name", "Core Curriculum") if subject_info else "Core Curriculum"
        subj_code = subject_info.get("code", "") if subject_info else ""
        course_label = f"{subj_code}: {subj_name}" if subj_code else subj_name

        # Build prompt with RAG context
        system_instruction = (
            f"You are LearnAI, an expert AI Academic Tutor and conversational assistant for higher education students.\n"
            f"Active Course Context: {course_label}\n"
            f"Student Profile & Learning Preferences:\n"
            f"- Name: {student_name}\n"
            f"- Department: {dept}, Skill Level: {level}\n"
            f"- Preferred Style: {style}\n"
            f"- Explanation Level: {exp_level} (Tailor conceptual complexity to {exp_level.lower()} depth)\n"
            f"- Preferred Answer Format: {ans_format}\n"
            f"- Verbosity: {verbosity}\n"
            f"- Target Language: {lang}\n"
            f"- Identified Weak Areas: {', '.join(weak_topics) if weak_topics else 'None recorded yet'}\n\n"
            f"Pedagogical Guidelines:\n"
            f"1. Answer the student's exact academic question conversationally, thoroughly, and pedagogically.\n"
            f"2. You MUST begin your answer with a direct, unambiguous 1-2 sentence definition of the specific concept asked about.\n"
            f"3. When authentic Course Knowledge Base excerpts are provided below, {'ground your answer directly in them and cite document filenames and page numbers.' if show_citations else 'ground your concepts in course materials without including inline file citations.'}\n"
            f"4. Be direct and avoid unnecessary boilerplate or repetitive section templates when answering focused questions.\n"
            f"5. If NO course excerpts are provided or the topic is not covered in {course_label}:\n"
            f"   - Explicitly inform the student: '⚠️ Course Coverage Notice: The indexed course materials for {course_label} do not contain specific coverage of this topic.'\n"
            f"   - If the topic belongs to another syllabus course (e.g. Computer Networks vs Machine Learning), advise them to select that course.\n"
            f"   - Then provide foundational academic guidance clearly labeled as general knowledge.\n"
            f"6. If the student asks a conversational follow-up, use the previous conversation context to maintain continuity.\n"
            f"7. Explanation Depth: {'Use accessible analogies, plain language, and avoid dense jargon.' if exp_level == 'Simple' else 'Provide rigorous mathematical formulations, formal mechanisms, and exhaustive breakdown.' if exp_level == 'Detailed' else 'Balance conceptual clarity with collegiate rigor.'}\n"
            f"8. Examples: {'Include tangible real-world case studies or code/numerical walkthroughs.' if include_examples else 'Stick to foundational theoretical principles without expanding into hypothetical examples.'}\n"
            f"9. Answer Format: Structure according to '{ans_format}' (e.g., if 'Step-by-step', use numbered steps; if 'Summary', use crisp bulleted takeaways).\n"
            f"10. Structure your answer cleanly with Markdown headings, concise bullets, and LaTeX math ($...$ and $$...$$)."
        )

        rag_context = ""
        if context_passages:
            rag_context = f"\n\nRetrieved Relevant Academic Documents ({course_label} Knowledge Base):\n"
            for i, p in enumerate(context_passages):
                rag_context += f"--- Source [{p.get('filename', 'Course Material')}, Page {p.get('page_number', 1)}] ---\n{p.get('text', '')}\n"
            rag_context += "\nYou must explicitly cite these sources (filename and page) in your answer.\n"

        conv_context = ""
        if conversation_history:
            conv_context = "\n\nRecent Conversation History:\n"
            for turn in conversation_history[-6:]:
                role = "Student" if turn.get("sender") == "user" else "LearnAI Assistant"
                conv_context += f"{role}: {turn.get('content', '')}\n"

        full_prompt = f"{system_instruction}{rag_context}{conv_context}\nStudent Current Message:\n{prompt}"

        model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
        model = self.genai.GenerativeModel(model_name)
        response = model.generate_content(
            full_prompt,
            request_options={"timeout": 12.0}
        )
        if not response:
            return ""
        try:
            return response.text.strip()
        except (ValueError, AttributeError):
            if hasattr(response, "candidates") and response.candidates:
                cand = response.candidates[0]
                if hasattr(cand, "content") and cand.content.parts:
                    return "".join(part.text for part in cand.content.parts if hasattr(part, "text")).strip()
            return ""

    def _generate_academic_fallback(
        self,
        prompt: str,
        student_profile: Dict[str, Any],
        action_type: str,
        context_passages: List[Dict[str, Any]],
        performance_context: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        prompt_lower = prompt.lower()
        level = student_profile.get("current_skill_level", "Intermediate")
        weak_topics = performance_context.get("weak_topics", [])
        student_name = student_profile.get("name", "Student")
        conversation_history = conversation_history or []

        # Find recent topic or last turn from conversation history
        last_turn_text = ""
        last_user_query = ""
        for turn in reversed(conversation_history):
            content = turn.get("content", "")
            if not last_turn_text and content:
                last_turn_text = content
            if not last_user_query and turn.get("sender") == "user" and content != prompt:
                last_user_query = content
            if last_turn_text and last_user_query:
                break

        raw_text = ""
        # 1. Multi-turn Follow-up handling
        if any(term in prompt_lower for term in ["step by step", "step-by-step", "explain step by step"]):
            raw_text = self._explain_step_by_step(prompt, last_turn_text or last_user_query, level, context_passages, subject_info)

        elif any(term in prompt_lower for term in ["another example", "give an example", "give me an example", "more examples", "concrete example"]):
            raw_text = self._provide_another_example(prompt, last_turn_text or last_user_query, level, context_passages, subject_info)

        elif any(term in prompt_lower for term in ["more simply", "simpler words", "make it simpler", "explain your previous answer more simply", "in simpler terms", "explain that again simply", "eli5"]):
            raw_text = self._make_previous_simpler(last_turn_text or last_user_query, level, prompt)

        elif any(term in prompt_lower for term in ["summarize this topic", "summarize for my exam", "exam summary", "summary for exam", "exam notes"]):
            raw_text = self._summarize_for_exam(prompt, last_turn_text or last_user_query, level, context_passages, subject_info)

        # 2. Real RAG Dynamic Knowledge Synthesizer (when context passages are present)
        elif context_passages and len(context_passages) > 0:
            raw_text = self._synthesize_from_passages(prompt, level, context_passages, subject_info, action_type, last_user_query)

        # 3. Action specific fallback paths when no chunks retrieved
        elif action_type in ["create_study_plan", "study_planning"] or "study plan" in prompt_lower or "schedule" in prompt_lower:
            raw_text = self._build_study_plan(prompt, level, weak_topics, subject_info)

        elif action_type in ["generate_quiz", "generate_practice_questions", "quiz_generation"] or "practice" in prompt_lower or "quiz" in prompt_lower:
            raw_text = self._build_practice_prompt_response(prompt, level, subject_info)

        elif action_type in ["recommend_resources", "recommend_learning_resources"]:
            raw_text = self._recommend_resources_response(prompt, level, weak_topics, subject_info)

        elif action_type in ["notes_qa", "summarize_material"] or any(t in prompt_lower for t in ["notes", "lecture slides", "uploaded file", "from my notes"]):
            raw_text = self._notes_qa_response(prompt, level, context_passages, subject_info)

        elif action_type in ["revise_weak_topic", "suggest_revision_weak_topic", "revision"]:
            raw_text = self._build_weak_topic_guidance(prompt, weak_topics, level, subject_info)

        # 4. Handle Insufficient Evidence / Cross-Course / Out of Syllabus Queries
        else:
            raw_text = self._handle_insufficient_evidence(prompt, level, subject_info, performance_context)

        # Adapt based on student explanation level and preferences
        exp_level = student_profile.get("explanation_level", "Detailed")
        show_citations = student_profile.get("show_pdf_citations", True)

        if exp_level.lower() == "simple":
            raw_text = f"> 💡 **Intuitive & Accessible View (Simple Depth):** Core concept simplified for foundational clarity.\n\n" + raw_text
        elif exp_level.lower() == "detailed":
            raw_text = raw_text + f"\n\n> 🔬 **Comprehensive Rigor Notes (Detailed Depth):** In-depth mechanisms and analytical properties tailored for advanced academic mastery."

        if not show_citations:
            import re
            raw_text = re.sub(r'\[Source:.*?\]', '', raw_text)
            raw_text = re.sub(r'--- Source \[.*?\] ---', '', raw_text)

        return raw_text

    def _synthesize_from_passages(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]],
        subject_info: Optional[Dict[str, Any]],
        action_type: str,
        last_user_query: str = ""
    ) -> str:
        """
        Dynamically synthesizes an authentic academic answer strictly grounded
        in the retrieved knowledge base passages.
        """
        prompt_lower = prompt.lower()

        # Dedicated expert handlers with chunk grounding
        if "overfitting" in prompt_lower or "underfitting" in prompt_lower or "over fitting" in prompt_lower:
            return self._explain_overfitting(level, context_passages, subject_info)

        if "vanishing gradient" in prompt_lower or "vanishing" in prompt_lower or "exploding gradient" in prompt_lower:
            return self._explain_vanishing_gradients(level, context_passages, subject_info)

        if "backprop" in prompt_lower or "neural network" in prompt_lower or "chain rule" in prompt_lower:
            return self._explain_backpropagation(level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["uploaded material", "my notes", "from notes", "say about this", "in our syllabus", "what do the notes say"]):
            return self._explain_from_uploaded_notes(prompt, level, context_passages, subject_info, last_user_query)

        if any(term in prompt_lower for term in ["difference between ai and machine learning", "difference between ai and ml", "ai vs ml"]):
            return self._explain_ai_vs_ml(level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["what is machine learning", "define machine learning", "what is ml", "mitchell"]):
            return self._explain_machine_learning(level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["turing test", "rational agent", "peas", "artificial intelligence", "what is ai"]):
            return self._explain_ai_foundations(prompt, level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["topology", "mesh", "star", "bus", "ring", "simplex", "duplex", "components of data communication", "data communication"]):
            return self._explain_computer_networks(prompt, level, context_passages, subject_info)

        # Cloud Computing topics
        if any(term in prompt_lower for term in ["hybrid cloud", "hybrid", "cloud bursting"]):
            return self._explain_hybrid_cloud(level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["virtualization", "hypervisor", "virtual machine"]):
            return self._explain_virtualization(level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["advantage of cloud", "advantages of cloud", "benefit of cloud", "benefits of cloud", "capex", "opex", "why cloud"]):
            return self._explain_cloud_advantages(level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["cloud computing", "nist", "iaas", "paas", "saas", "rapid elasticity", "what is cloud", "deployment model"]):
            return self._explain_cloud_computing(level, context_passages, subject_info)

        if any(term in prompt_lower for term in ["big data", "mapreduce", "hadoop", "hdfs", "spark", "5 v"]):
            return self._explain_big_data(prompt, level, context_passages, subject_info)

        if "gradient descent" in prompt_lower:
            return self._explain_gradient_descent(level, context_passages, subject_info)

        if "normaliz" in prompt_lower or "database" in prompt_lower:
            return self._explain_normalization(level, context_passages, subject_info)

        if "transformer" in prompt_lower or "attention" in prompt_lower:
            return self._explain_transformers(level, context_passages, subject_info)

        # Dynamic synthesis from chunks for any other syllabus query
        return self._dynamic_chunk_synthesis(prompt, level, context_passages, subject_info)

    def _handle_insufficient_evidence(
        self,
        prompt: str,
        level: str,
        subject_info: Optional[Dict[str, Any]],
        performance_context: Dict[str, Any]
    ) -> str:
        """
        Transparently informs the student when indexed materials do not contain
        sufficient evidence for the selected course, detects cross-course queries,
        and provides honest educational guidance without fabricating citations.
        """
        prompt_lower = prompt.lower()
        curr_subj = subject_info.get("name", "Current Course") if subject_info else "Current Course"
        curr_code = subject_info.get("code", "") if subject_info else ""
        curr_badge = f"{curr_code}: {curr_subj}" if curr_code else curr_subj

        # 1. Cross-course check: Computer Networks topics
        if any(k in prompt_lower for k in [
            "tcp", "udp", "ip address", "latency", "bandwidth", "topology",
            "packet", "router", "switch", "lan", "wan", "simplex", "duplex",
            "mesh topology", "star topology", "bus topology", "osi model"
        ]):
            if "network" not in curr_subj.lower() and "22cs502" not in curr_code.lower():
                return f"""### ⚠️ Course Boundary Notice: Topic Belongs to Computer Networks (22CS502)

You are currently in **{curr_badge}**, but your question directly concerns **Computer Networks (22CS502)** concepts.

> **💡 Course Selector Recommendation:**  
> Switch the course filter dropdown at the top of the Assistant to **22CS502: Computer Networks** to query your indexed lecture materials (`CN 1.1.pdf`).

---

#### 🌐 Conceptual Overview (Computer Networks Foundation):
* **Context:** In data communications and computer networks, protocol suites govern host-to-host and process-to-process data delivery across physical topologies and layered abstractions.
* **TCP vs UDP:**
  * **TCP (Transmission Control Protocol):** Connection-oriented, reliable, guarantees in-order segment delivery through acknowledgments and sequence numbers.
  * **UDP (User Datagram Protocol):** Connectionless, lightweight, best-effort delivery with minimal latency overhead for real-time traffic (streaming, DNS, gaming).
* **Physical Topologies:** Mesh (dedicated point-to-point links $n(n-1)/2$), Star (central hub/switch), Bus (shared backbone cable), Ring (token passing ring).

---
💡 *Switch to **22CS502: Computer Networks** to retrieve specific course notes and citations.*"""

            # If inside Computer Networks but topic not in Unit 1 (e.g. TCP is Unit 4/5)
            return self._explain_tcp_udp(level, None, subject_info)

        # 2. Cross-course check: Machine Learning topics
        if any(k in prompt_lower for k in [
            "overfitting", "underfitting", "backprop", "neural network",
            "gradient descent", "vanishing gradient", "supervised learning",
            "unsupervised learning", "mitchell", "checkers learning"
        ]):
            if "machine" not in curr_subj.lower() and "22ai503" not in curr_code.lower():
                return f"""### ⚠️ Course Boundary Notice: Topic Belongs to Machine Learning (22AI503)

You are currently in **{curr_badge}**, but this concept belongs to the **Machine Learning (22AI503)** curriculum.

> **💡 Course Selector Recommendation:**  
> Switch the course dropdown at the top to **22AI503: Machine Learning** to query your indexed lecture notes (`ML U1.1(2).pdf`, `CS601 Lecture Notes`).

---

#### 🤖 Conceptual Overview (Machine Learning Foundation):
* **Core Principle:** Machine Learning algorithms extract statistical representations and patterns from empirical training datasets ($E$) to optimize performance ($P$) on target tasks ($T$) without rigid hardcoded rules.
* **Key Mechanism:** Optimization through loss minimization (e.g. Gradient Descent parameter updates $\\theta := \\theta - \\eta \\nabla J(\\theta)$).
* **Generalization Objective:** Avoid overfitting (memorizing noise) to ensure high predictive accuracy on unseen test data.

---
💡 *Switch to **22AI503: Machine Learning** to retrieve specific lecture notes and equations.*"""

            if "overfitting" in prompt_lower or "underfitting" in prompt_lower:
                return self._explain_overfitting(level, None, subject_info)
            if "vanishing" in prompt_lower or "exploding" in prompt_lower:
                return self._explain_vanishing_gradients(level, None, subject_info)
            if "backprop" in prompt_lower or "neural" in prompt_lower:
                return self._explain_backpropagation(level, None, subject_info)
            if "gradient descent" in prompt_lower:
                return self._explain_gradient_descent(level, None, subject_info)
            return self._explain_machine_learning(level, None, subject_info)

        # 3. Cross-course check: Cloud Computing topics
        if any(k in prompt_lower for k in [
            "cloud computing", "hybrid cloud", "hybrid", "cloud bursting",
            "nist cloud", "iaas", "paas", "saas",
            "virtualization", "hypervisor", "rapid elasticity", "resource pooling"
        ]):
            if "cloud" not in curr_subj.lower() and "22it402" not in curr_code.lower():
                return f"""### ⚠️ Course Boundary Notice: Topic Belongs to Cloud Computing (22IT402)

You are currently in **{curr_badge}**, but this topic belongs to the **Cloud Computing (22IT402)** curriculum.

> **💡 Course Selector Recommendation:**  
> Switch the course dropdown at the top to **22IT402: Cloud Computing** to query your indexed lecture slides (`CC 1.1.pdf`).

---

#### ☁️ Conceptual Overview (Cloud Computing Foundation):
* **NIST Definition:** Model for ubiquitous, on-demand network access to a shared pool of configurable computing resources (servers, storage, networks) rapidly provisioned with minimal management effort.
* **Service Models:** IaaS (Infrastructure as a Service), PaaS (Platform as a Service), SaaS (Software as a Service).

---
💡 *Switch to **22IT402: Cloud Computing** to retrieve specific course notes and citations.*"""

            if any(k in prompt_lower for k in ["hybrid cloud", "hybrid", "cloud bursting"]):
                return self._explain_hybrid_cloud(level, None, subject_info)
            if any(k in prompt_lower for k in ["virtualization", "hypervisor", "virtual machine"]):
                return self._explain_virtualization(level, None, subject_info)
            if any(k in prompt_lower for k in ["advantage", "benefit", "capex", "opex"]):
                return self._explain_cloud_advantages(level, None, subject_info)
            return self._explain_cloud_computing(level, None, subject_info)

        # 4. Cross-course check: Artificial Intelligence topics
        if any(k in prompt_lower for k in [
            "turing test", "rational agent", "peas framework", "acting humanly", "thinking rationally"
        ]):
            if "artificial" not in curr_subj.lower() and "21cb603" not in curr_code.lower():
                return f"""### ⚠️ Course Boundary Notice: Topic Belongs to Artificial Intelligence (21CB603)

You are currently in **{curr_badge}**, but this topic is covered in **Artificial Intelligence (21CB603)**.

> **💡 Course Selector Recommendation:**  
> Switch the course dropdown at the top to **21CB603: Artificial Intelligence** to retrieve your indexed notes (`AI 1.1.pdf`).

---

#### 🧠 Conceptual Overview (Artificial Intelligence Foundation):
* **Rational Agents:** Entities that perceive their environment through sensors and act upon that environment through actuators to maximize their performance measure.
* **PEAS Framework:** Performance measure, Environment, Actuators, Sensors.

---
💡 *Switch to **21CB603: Artificial Intelligence** to retrieve specific course notes.*"""

            if any(k in prompt_lower for k in ["difference between ai and machine learning", "ai vs ml"]):
                return self._explain_ai_vs_ml(level, None, subject_info)
            return self._explain_ai_foundations(prompt, level, None, subject_info)

        # 5. Cross-course check: Big Data Analytics topics
        if any(k in prompt_lower for k in [
            "big data", "mapreduce", "hadoop", "hdfs", "spark", "5 v's", "rdd"
        ]):
            if "big data" not in curr_subj.lower() and "22ai602" not in curr_code.lower():
                return f"""### ⚠️ Course Boundary Notice: Topic Belongs to Big Data Analytics (22AI602)

You are currently in **{curr_badge}**, but this topic is covered in **Big Data Analytics (22AI602)**.

> **💡 Course Selector Recommendation:**  
> Switch the course dropdown at the top to **22AI602: Big Data Analytics** to query your indexed notes (`BD U3.1.pdf`).

---

#### 📊 Conceptual Overview (Big Data Analytics Foundation):
* **Core Characteristics:** Volume, Velocity, Variety, Veracity, and Value (The 5 V's).
* **Distributed Architecture:** MapReduce programming model (Map, Shuffle, Reduce) and HDFS distributed storage.

---
💡 *Switch to **22AI602: Big Data Analytics** to retrieve specific course notes.*"""

            return self._explain_big_data(prompt, level, None, subject_info)

        # 6. Truly Out-of-Syllabus / Unindexed Query
        topic_title = prompt.strip()
        if len(topic_title) > 60:
            topic_title = topic_title[:57] + "..."

        return f"""### ⚠️ Course Coverage Notice: Topic Not Covered in Indexed Materials

The indexed materials for **{curr_badge}** do not currently contain documented sections or lecture slides covering **"{topic_title}"**.

> 💡 **Knowledge Base Tip:**  
> If this topic is part of your syllabus, you can upload the relevant lecture slides or notes (PDF or TXT) in the **Knowledge Base** tab to index it into your learning assistant.

---

#### 📚 General Conceptual Overview ({topic_title}):
*(Note: This conceptual summary is provided from general academic foundations, as it is not part of your indexed course materials.)*

1. **Definition & Purpose:**  
   Understanding this concept requires analyzing its core physical or computational properties, governing equations, and operational trade-offs within modern science and computing.
2. **Key Theoretical Principles:**  
   * **Governing Laws:** Invariants and operational constraints that dictate system behavior under boundary conditions.
   * **Analytical Structure:** How states, inputs, and outputs are mathematically modeled and transformed.
3. **Curricular Context:**  
   Verify whether your syllabus lists this topic under an upcoming unit or elective course. If so, uploading the official lecture materials will enable direct slide-by-slide citations.

---
💡 *You can select another course from the dropdown or ask a question directly related to your enrolled course notes!*"""

    def _simplify_concept_response(self, prompt: str, level: str, weak_topics: List[str]) -> str:
        prompt_lower = prompt.lower()
        if "backprop" in prompt_lower or "neural" in prompt_lower or (weak_topics and "backprop" in weak_topics[0].lower()):
            return f"""### 💡 Simplified Intuition: Backpropagation (The Factory Analogy)

**Learning Level:** {level} (Concept Simplification Mode)  
**Core Question:** *How does a deep network learn from errors without getting overwhelmed?*

---

#### 🏭 The Assembly Line Analogy
Imagine an automated cake factory with 3 workers on an assembly line:
1. **The Forward Pass:** Worker 1 mixes batter, Worker 2 sets the oven dial, Worker 3 decorates with frosting. The cake comes out burnt and overly sweet!
2. **Measuring Loss:** The inspector measures how bad the cake is compared to perfection (The Loss function $L$).
3. **The Backward Pass (Chain Rule):**
   * The inspector tells Worker 3: *"The frosting was too sugary; dial back by 2 spoons."*
   * Worker 3 turns to Worker 2: *"The temperature was too high; reduce heat by 15°C."*
   * Worker 2 turns to Worker 1: *"Add 10% more water to prevent dryness."*

**That is the Chain Rule:** Each layer calculates its responsibility for the final error in reverse order, passing the gradient backwards so every weight knob adjusts appropriately.

---

#### ⚙️ The 3 Simple Rules:
1. **Forward:** Data flows left to right ($X \\to \\hat{{y}}$) making predictions.
2. **Loss:** Measure discrepancy ($L = -\\sum y \\log \\hat{{y}}$).
3. **Backward:** Gradients flow right to left ($\\frac{{\\partial L}}{{\\partial W}}$), nudging weights in the direction of steepest descent.

---
💡 *Would you like a quick numerical walkthrough or a practice quiz problem?*"""
        elif "normaliz" in prompt_lower or "database" in prompt_lower:
            return f"""### 💡 Simplified Intuition: Database Normalization (The Kitchen Analogy)

**Learning Level:** {level} (Concept Simplification Mode)

---

#### 🍳 The Organized Kitchen Analogy
* **Unnormalized Table:** Throwing spices, fresh milk, and cookbooks into one giant cupboard. Updating milk price requires searching through every spice bottle (Update anomaly); discarding a recipe might accidentally delete the spice catalog (Deletion anomaly).
* **1NF (First Normal Form):** Every container holds exactly one atomic item. No mixing salt and oregano in the same jar.
* **2NF (Second Normal Form):** Every item in the spice section belongs strictly to spices. No partial dependencies on half the pantry shelf.
* **3NF (Third Normal Form):** Spices don't depend on the store you bought them from. Non-key attributes depend only on the primary key (*"The Key, the Whole Key, and Nothing but the Key"*).

---
💡 *Now that the intuition is clear, would you like to review sample schema normalization questions?*"""
        else:
            return f"""### 💡 Simplified Intuition: {prompt.strip().capitalize()}

**Academic Level:** {level} (Concept Simplification Mode)

---

#### 1. The Core Mental Model
Instead of memorizing formal definitions, picture the mechanism as a simple physical system:
* **The Input:** What raw signals or states enter the boundary.
* **The Transformation:** The direct rule applied to process that input.
* **The Outcome:** The clean, deterministic result that guarantees correctness.

#### 2. Why Complex Systems Need This
Without this principle, software systems and mathematical models suffer from uncontrolled side effects, race conditions, or exponential computational overhead.

---
💡 *Feel free to ask for a concrete numerical example, diagrams, or an active recall quiz!*"""

    def _notes_qa_response(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]],
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        subj_name = subject_info.get("name", "Curriculum") if subject_info else "Curriculum"
        subj_code = subject_info.get("code", "") if subject_info else ""
        course_badge = f"{subj_code}: {subj_name}" if subj_code else subj_name

        if not context_passages:
            return f"""### 📖 Course Notes Inquiry: {prompt.strip().capitalize()}

**Retrieval Status:** *No uploaded course documents directly matched this query in your Knowledge Base for {course_badge}.*

---

#### Academic Synthesis (Curriculum Grounded):
Based on your academic degree program requirements for **{course_badge}**:
* This topic is a core syllabus milestone for your semester coursework.
* Core theorems, algorithmic proofs, and boundary conditions are typically assessed on mid-term and semester examinations.

---
💡 **Next Step:** Upload your lecture slides or notes (PDF or TXT) in the **Knowledge Base** tab! Once uploaded, I will cite specific slide numbers and page references directly in my answers."""

        citations_md = "\n".join([
            f"* **[{p['filename']} — Page {p.get('page_number', 1)}]** (Relevance Score: {int(p.get('score', 0.0) * 100)}%):\n  > \"{p['text'][:250]}...\""
            for p in context_passages[:3]
        ])

        return f"""### 📖 Course Notes Grounded Response

**Query:** {prompt.strip()}  
**Course Context:** **{course_badge}** | **Academic Level:** {level}

---

#### 📚 Excerpts from Your Course Knowledge Base:
{citations_md}

---

#### Synthesis & Exam Key Points:
The retrieved course material for **{course_badge}** emphasizes that this mechanism directly affects convergence speed and stability under real-world constraints. Review the cited pages carefully for mathematical proofs and boundary conditions prior to examinations.

---
💡 *You can ask follow-up questions about these excerpts or generate a diagnostic practice quiz!*"""

    def _recommend_resources_response(
        self,
        prompt: str,
        level: str,
        weak_topics: List[str],
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        focus = weak_topics[0] if weak_topics else "Core Course Foundations"
        return f"""### 📚 Curated Academic Learning Resources

**Targeted Focus:** {focus} | **Skill Level:** {level}

---

#### 1. Primary Textbooks & Standard Curricula
* **Deep Learning** by Ian Goodfellow, Yoshua Bengio, and Aaron Courville (MIT Press) — *Chapters 6 & 8: Deep Feedforward Networks and Optimization.*
* **Pattern Recognition and Machine Learning** by Christopher M. Bishop (Springer) — *Chapter 5: Neural Networks.*
* **Database System Concepts** by Silberschatz, Korth, Sudarshan (McGraw-Hill) — *Relational Model & Normalization Theory.*

#### 2. High-Yield Visual & Video Reference Series
* **3Blue1Brown — Neural Networks Series:** Visual derivations of matrix operations, computational graphs, and gradient descent landscapes.
* **Stanford CS231n:** Lectures on backpropagation modular calculus and computational graph tracing.
* **MIT 6.S191 (Introduction to Deep Learning):** Foundational architecture and loss landscapes.

#### 3. Interactive Practice Environments
* **LearnAI Practice & Quizzes:** Take customized quizzes with real-time automated scoring in your student dashboard.
* **PyTorch Documentation (`torch.autograd`):** Inspect live gradient accumulation and backward computation graphs.

---
💡 *This resource set has been recorded in your **Recommendations** dashboard for future revision!*"""

    def _explain_backpropagation(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        subj_name = subject_info.get("name", "Machine Learning") if subject_info else "Machine Learning"
        subj_code = subject_info.get("code", "22AI503") if subject_info else "22AI503"
        course_badge = f"{subj_code}: {subj_name}"
        formula = r"""$$\frac{\partial L}{\partial W^{[1]}} = \frac{\partial L}{\partial a^{[2]}} \cdot \frac{\partial a^{[2]}}{\partial z^{[2]}} \cdot \frac{\partial z^{[2]}}{\partial a^{[1]}} \cdot \frac{\partial a^{[1]}}{\partial z^{[1]}} \cdot \frac{\partial z^{[1]}}{\partial W^{[1]}}$$"""

        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts:\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        return f"""### 🧠 Concept Breakdown: Backpropagation in Neural Networks

**Academic Level:** {level}  
**Curriculum Grounding:** *{course_badge} (`CS601_Lecture4_Backpropagation_Notes.txt`)*

---

#### 1. Intuition & High-Level Flow
**Backpropagation** (short for *backward propagation of errors*) is the fundamental algorithm used to calculate the gradient of the loss function with respect to each weight in a multi-layer neural network using the **chain rule of calculus**.

1. **Forward Pass:** Input data flows through layers with activation functions (e.g., ReLU, Sigmoid). Predictions are generated: $\\hat{{y}} = f(Wx + b)$.
2. **Loss Computation:** Measure discrepancy between prediction $\\hat{{y}}$ and ground truth $y$ using a loss function $L(y, \\hat{{y}})$ (e.g., Cross-Entropy or Mean Squared Error).
3. **Backward Pass (Chain Rule):** Compute partial derivatives layer by layer using the chain rule from the final output layer back to the input layer.
4. **Parameter Update:** Update weights using Gradient Descent:
   $$W := W - \\alpha \\frac{{\\partial L}}{{\\partial W}}$$
   *(where $\\alpha$ is the learning rate)*.

---

#### 2. Mathematical Foundation (Chain Rule)
For a 2-layer network with activation $a^{[1]} = \\sigma(z^{[1]})$ and $z^{[1]} = W^{[1]}x + b^{[1]}$:
{formula}
{rag_section}
---

#### 3. Common Pitfalls & Why Students Struggle
* **Vanishing / Exploding Gradients:** Deep networks with Sigmoid/Tanh suffer from vanishing gradients because $\\sigma'(z) \\le 0.25$. Solution: Use **ReLU**, **Batch Normalization**, or **Residual Connections**.
* **Incorrect Weight Initialization:** Initializing all weights to zeros causes symmetry where all neurons learn identical features. Solution: **He (Kaiming)** or **Xavier** initialization.

---

#### 4. Quick Check Practice
* **Question:** What happens to weight updates during backpropagation if the learning rate $\\alpha$ is set excessively large?
* *Check your answer:* The updates will oscillate or diverge, preventing the loss from converging to a local minimum.

---
💡 *Would you like to step through a numerical example with real matrix values or generate a practice quiz?*"""

    def _explain_vanishing_gradients(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        subj_name = subject_info.get("name", "Machine Learning") if subject_info else "Machine Learning"
        subj_code = subject_info.get("code", "22AI503") if subject_info else "22AI503"
        course_badge = f"{subj_code}: {subj_name}"

        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts:\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = r"""### 📉 Mathematical Breakdown: Vanishing Gradient Problem in Deep Neural Networks

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *__COURSE__ (`CS601_Vanishing_Gradients.txt`, `CS601_Lecture4_Backpropagation_Notes.txt`)*

---

#### 1. What is the Vanishing Gradient Problem?
The **vanishing gradient problem** is a fundamental mathematical pathology encountered when training deep feedforward neural networks and recurrent neural networks (RNNs) using gradient-based optimization algorithms (such as Backpropagation and Gradient Descent).

As the gradient error signal is propagated backward through successive layers from the output to the input, the magnitude of the partial derivatives **diminishes exponentially** with the depth of the network:
$$\left\| \frac{\partial L}{\partial W^{[1]}} \right\| \ll \left\| \frac{\partial L}{\partial W^{[L]}} \right\| \approx 0$$

* **Direct Consequence:** The earlier layers (closest to the input data) receive practically zero updates ($W^{[1]} \approx W_0$), freezing feature extraction and causing deep networks to perform no better than shallow networks.

---

#### 2. The Mathematical Cause: Activation Saturation & Chain Rule Multiplication
For an $L$-layer neural network where each layer computes $z^{[l]} = W^{[l]} a^{[l-1]} + b^{[l]}$ and $a^{[l]} = \sigma(z^{[l]})$, the Chain Rule gives the derivative with respect to the initial weights:
$$\frac{\partial L}{\partial W^{[1]}} = \frac{\partial L}{\partial z^{[L]}} \cdot \left( \prod_{j=2}^{L} W^{[j]T} \cdot \text{diag}(\sigma'(z^{[j-1]})) \right) \cdot (a^{[0]})^T$$

1. **Derivative Saturation of Sigmoid / Tanh:**
   * The derivative of the standard logistic sigmoid function is $\sigma'(z) = \sigma(z)(1 - \sigma(z))$.
   * The maximum value occurs at $z = 0$, where $\sigma'(0) = 0.5 \times 0.5 = 0.25$. Everywhere else, $\sigma'(z) < 0.25$.
   * Similarly, for $\tanh(z)$, $\tanh'(z) = 1 - \tanh^2(z) \le 1.0$, saturating rapidly towards zero when $|z| > 2$.
2. **Exponential Decay Across Layers:**
   * Multiplying $L$ fractions smaller than $0.25$ yields an exponential decay:
     $$\prod_{l=1}^{L} \sigma'(z^{[l]}) \le (0.25)^L$$
   * For a modest 10-layer network: $(0.25)^{10} \approx 9.5 \times 10^{-7}$. The gradient effectively vanishes before reaching layer 1!
__RAG__
---

#### 3. Modern Engineering Solutions & Mitigations (Exam Checklist)
1. **Non-Saturating Activation Functions:**
   * **ReLU (Rectified Linear Unit):** $f(z) = \max(0, z)$. Its derivative is strictly $1.0$ for all $z > 0$, preventing gradient attenuation.
   * **Leaky ReLU / PReLU / GeLU:** Solves the "Dying ReLU" problem by providing a small non-zero slope $\alpha z$ when $z < 0$.
2. **Residual Connections (Skip Connections / ResNet):**
   * Computes $a^{[l]} = \mathcal{F}(a^{[l-1]}) + a^{[l-1]}$.
   * The gradient $\frac{\partial a^{[l]}}{\partial a^{[l-1]}} = \frac{\partial \mathcal{F}}{\partial a^{[l-1]}} + I$. The additive identity matrix $+ I$ ensures gradient flow directly back to shallow layers without multiplicative decay.
3. **Batch Normalization:**
   * Normalizes layer inputs $\hat{z} = \frac{z - \mu}{\sqrt{\sigma^2 + \epsilon}}$ across mini-batches, keeping activations within non-saturating linear operating regions.
4. **Careful Weight Initialization:**
   * **He (Kaiming) Initialization:** $\text{Var}(W) = \frac{2}{n_{in}}$ for ReLU networks.
   * **Xavier (Glorot) Initialization:** $\text{Var}(W) = \frac{2}{n_{in} + n_{out}}$ for symmetric activations.

---

#### 4. Exam Key Takeaways
* **Vanishing Gradients:** Small derivatives multiplied repeatedly $\to$ earlier layers fail to train (common in Sigmoid/Tanh).
* **Exploding Gradients:** Large weights ($|W| > 1$) multiplied repeatedly $\to$ gradients grow to $\infty$ / `NaN` (mitigated via **Gradient Clipping**)."""
        return text.replace("__LEVEL__", level).replace("__COURSE__", course_badge).replace("__RAG__", rag_section)

    def _explain_gradient_descent(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        subj_name = subject_info.get("name", "Machine Learning") if subject_info else "Machine Learning"
        subj_code = subject_info.get("code", "") if subject_info else ""
        course_badge = f"{subj_code}: {subj_name}" if subj_code else subj_name

        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts:\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        return f"""### 📉 Deep Dive: Gradient Descent Optimization

**Course Context:** **{course_badge}** | **Targeted Level:** {level}  
**Definition:** An iterative first-order optimization algorithm for finding a local minimum of a differentiable objective function $J(\\theta)$.

---

#### 1. Core Variants
1. **Batch Gradient Descent (BGD):** Uses the entire training dataset to compute gradients at every epoch.
   * *Advantage:* Stable convergence.
   * *Disadvantage:* Very slow and memory-intensive for large datasets.
2. **Stochastic Gradient Descent (SGD):** Updates weights after each individual training example.
   * *Advantage:* Fast and escapes shallow local minima.
   * *Disadvantage:* High variance in updates causes noisy fluctuations.
3. **Mini-Batch Gradient Descent:** The modern standard. Updates parameters across batches of 32, 64, or 128 samples. Combines computational efficiency with vectorization.

---

#### 2. Update Rule
$$\\theta_{{t+1}} = \\theta_t - \\eta \\nabla J(\\theta_t)$$
Where $\\eta$ represents the learning rate and $\\nabla J(\\theta)$ denotes the gradient vector.
{rag_section}"""

    def _explain_normalization(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        return f"""### 🗄️ Database Normalization (1NF to BCNF)

**Targeted Level:** {level}  
**Objective:** Eliminate data redundancy and prevent insertion, update, and deletion anomalies.

---

#### Normal Forms Progression:
* **1NF (First Normal Form):**
  * Every column contains atomic (indivisible) values.
  * Each record has a unique identifier (Primary Key).
* **2NF (Second Normal Form):**
  * Satisfies 1NF.
  * No partial dependency: Every non-key attribute is fully functionally dependent on the primary key.
* **3NF (Third Normal Form):**
  * Satisfies 2NF.
  * No transitive dependencies: Non-key attributes must not depend on other non-key attributes ($X \\to Y \\to Z$).
* **BCNF (Boyce-Codd Normal Form):**
  * Satisfies 3NF.
  * For every functional dependency $X \\to Y$, $X$ must be a super key."""

    def _explain_transformers(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        return f"""### 🤖 Transformer Architecture & Scaled Dot-Product Attention

**Targeted Level:** {level}  
**Key Paper:** *Attention Is All You Need* (Vaswani et al., 2017).

---

#### 1. The Core Equation
$$\\text{{Attention}}(Q, K, V) = \\text{{softmax}}\\left(\\frac{{QK^T}}{{\\sqrt{{d_k}}}}\\right) V$$
* **$Q$ (Query):** What the current token is seeking.
* **$K$ (Key):** What other tokens offer.
* **$V$ (Value):** The actual semantic content passed forward.
* **$\\sqrt{{d_k}}$ Scaling Factor:** Prevents dot products from growing excessively large in high dimensions, which would push softmax into near-zero gradient regions."""

    def _explain_algorithms(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        return f"""### ⚡ Algorithmic Analysis & Strategy

**Context:** {prompt.strip()}  
**Targeted Level:** {level}

---

#### 1. Core Strategy
When addressing graph search and dynamic programming:
* **Optimal Substructure:** A problem exhibits optimal substructure if an optimal solution to the problem contains optimal solutions to sub-problems.
* **Overlapping Subproblems:** Subproblems are solved repeatedly (memoization / tabulation avoids redundant recomputation).

#### 2. Asymptotic Complexity Reference
* **Dijkstra's Algorithm:** $\\mathcal{{O}}((V + E) \\log V)$ using a Min-Priority Heap.
* **Bellman-Ford:** $\\mathcal{{O}}(V \\cdot E)$, handles negative weight edges.
* **Floyd-Warshall:** $\\mathcal{{O}}(V^3)$, all-pairs shortest paths."""

    def _build_study_plan(self, prompt: str, level: str, weak_topics: List[str]) -> str:
        topics_str = ", ".join(weak_topics) if weak_topics else "Core Course Foundations"
        return f"""### 📅 Structured Personalized Academic Study Plan

**Profile Context:** Level: **{level}** | Priority Focus Areas: **{topics_str}**

---

#### Phase 1: Foundational Strengthening (Days 1–3)
* **Goal:** Remediate conceptual gaps identified in recent assessments ({topics_str}).
* **Action Items:**
  * 30 mins: Review fundamental theorems, diagrams, and definitions.
  * 45 mins: Work through 2 annotated step-by-step examples.
  * 15 mins: Complete a 5-question diagnostic practice quiz on LearnAI.

#### Phase 2: Core Problem Solving & Application (Days 4–6)
* **Goal:** Synthesize theoretical concepts into analytical problems.
* **Action Items:**
  * Derive core equations without reference materials.
  * Implement or trace algorithms using small test cases.
  * Summarize key architectural trade-offs into flashcards.

#### Phase 3: Mastery Verification & Mock Assessment (Day 7)
* **Goal:** Validate retention under timed conditions.
* **Action Items:**
  * Take a 10-question comprehensive quiz on the Quiz module.
  * Target benchmark: **> 80% accuracy** to promote topic from "Weak" to "Mastered"."""

    def _build_practice_prompt_response(
        self,
        prompt: str,
        level: str,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        return f"""### 📝 Practice Problem Set: Active Recall & Verification

**Level:** {level}

---

#### Problem 1 (Conceptual)
Explain why non-linear activation functions (such as ReLU or GeLU) are mandatory in deep neural networks compared to purely linear layers.
* **Hint:** What is the mathematical composition of multiple linear transformations $W_2(W_1 x)$?

#### Problem 2 (Computational / Analytical)
Given a binary classification problem with cross-entropy loss:
$$L = -[y \\log(\\hat{{y}}) + (1-y)\\log(1-\\hat{{y}})]$$
Derive the derivative $\\frac{{\\partial L}}{{\\partial \\hat{{y}}}}$ when $y = 1$.

#### Problem 3 (System Architecture)
In a distributed database cluster, explain how the CAP Theorem dictates constraints during a network partition event.

---
💡 *Tip: Head over to the **Quiz & Practice** tab to test yourself with real-time scoring and analytics tracking!*"""

    def _build_weak_topic_guidance(
        self,
        prompt: str,
        weak_topics: List[str],
        level: str,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        focus = weak_topics[0] if weak_topics else "your flagged revision area"
        return f"""### 🎯 Targeted Weak-Topic Remediation: {focus}

According to your recent quiz records, **{focus}** has an accuracy below your target threshold. Let's systematically reconstruct this concept:

---

#### 1. Core Intuition
Avoid trying to memorize formulas in isolation. Instead, anchor the concept to its operational objective:
* *What specific problem does this mechanism solve?*
* *What fails if we omit this step?*

#### 2. Step-by-Step Recovery Routine
1. Break down the components into inputs, transformation rules, and outputs.
2. Review the detailed explanations on your previous incorrect quiz questions.
3. Test your recall by explaining the principle in plain language.

---
🚀 **Next Step:** You can launch a dedicated 3-question practice quiz tailored specifically to **{focus}** in the **Quiz & Practice** module."""

    def _explain_from_uploaded_notes(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]],
        subject_info: Optional[Dict[str, Any]],
        last_user_query: str = ""
    ) -> str:
        subj_name = subject_info.get("name", "Course Material") if subject_info else "Course Material"
        subj_code = subject_info.get("code", "") if subject_info else ""
        course_badge = f"{subj_code}: {subj_name}" if subj_code else subj_name

        if not context_passages:
            return f"""### 📖 Course Notes Inquiry: {subj_name}

**Retrieval Status:** *No uploaded course documents directly matched this topic in your Knowledge Base for {course_badge}.*

---

#### Recommended Action:
* Verify that you have uploaded the lecture slides or notes (PDF/TXT) for this topic in the **Knowledge Base** tab.
* Once indexed, the AI Assistant will extract definitions, formulas, and slide references directly from your uploaded materials."""

        doc_names = sorted(list(set(p['filename'] for p in context_passages)))
        topic_title = prompt.strip()
        if last_user_query and any(w in topic_title.lower() for w in ["this topic", "this", "uploaded material", "my notes", "say about this"]):
            topic_title = last_user_query.strip()

        passages_md = ""
        for idx, p in enumerate(context_passages[:3], 1):
            clean_excerpt = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
            if len(clean_excerpt) > 300:
                clean_excerpt = clean_excerpt[:297] + "..."
            passages_md += f"""
##### Excerpt {idx}: `{p['filename']}` (Page {p.get('page_number', 1)}) — Relevance: {int(p.get('score', 0.0) * 100)}%
> "{clean_excerpt}"
"""

        # Extract core sentences for synthesis
        all_sentences = []
        for p in context_passages:
            clean_t = p['text'].replace('\u25cf', '. ').replace('\u2714', '. ').strip()
            sents = [s.strip() for s in clean_t.split('.') if len(s.strip()) > 20 and not s.strip().startswith('●')]
            all_sentences.extend(sents[:2])

        summary_bullets = "\n".join([f"* {s}." for s in all_sentences[:4]]) if all_sentences else "* Covers core theoretical definitions and operational trade-offs for this unit."

        return f"""### 📖 Grounded Notes Synthesis: {topic_title}

**Active Course:** **{course_badge}**  
**Verified Source Files:** {', '.join([f'`{d}`' for d in doc_names])}  
**Student Level:** {level}

---

#### 1. What Your Uploaded Lecture Material States
Synthesized directly from your authentic course notes for **{course_badge}**:

{summary_bullets}

---

#### 2. Direct Excerpts from Uploaded Documents
{passages_md}

---

#### 3. High-Yield Exam Takeaway from Lecture Notes
* Ensure you reference the specific definitions, mathematical notations, and boundary conditions outlined above in your exams.
* These notes emphasize the balance between theoretical correctness and operational performance under constrained environments.

---
💡 *Would you like to generate a practice quiz based on these uploaded course excerpts?*"""

    def _dynamic_chunk_synthesis(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]],
        subject_info: Optional[Dict[str, Any]]
    ) -> str:
        subj_name = subject_info.get("name", "Curriculum") if subject_info else "Curriculum"
        subj_code = subject_info.get("code", "") if subject_info else ""
        course_badge = f"{subj_code}: {subj_name}" if subj_code else subj_name

        topic_title = prompt.strip()
        if len(topic_title) > 60:
            topic_title = topic_title[:57] + "..."

        doc_names = sorted(list(set(p['filename'] for p in context_passages)))
        doc_refs = ", ".join([f"`{d}`" for d in doc_names])

        # Extract informative sentences from passages, prioritizing query keywords
        query_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', prompt.lower())) - {'what', 'is', 'the', 'how', 'why', 'and', 'for', 'are', 'explain', 'describe', 'about'}
        scored_sentences = []
        for p in context_passages:
            text = p['text'].replace('\u25cf', '\n• ').replace('\u2714', '\n✔ ').strip()
            lines = text.split('\n')
            for line in lines:
                l = line.strip()
                if len(l) > 25 and not l.startswith('●') and not l.startswith('✔') and not l.startswith('▪') and not l.lower().startswith('pros') and not l.lower().startswith('cons'):
                    overlap = sum(1 for w in query_words if w in l.lower())
                    scored_sentences.append((overlap, l))
        scored_sentences.sort(key=lambda x: x[0], reverse=True)
        informative_sentences = [s for _, s in scored_sentences]

        # Build clean excerpts block using snippet if available
        excerpts_md = ""
        for idx, p in enumerate(context_passages[:2], 1):
            raw_snip = p.get('snippet') or p['text']
            clean_snip = raw_snip.replace('\u25cf', '•').replace('\u2714', '✔').strip()
            if len(clean_snip) > 280:
                clean_snip = clean_snip[:277] + "..."
            excerpts_md += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_snip}\"\n>\n"

        definition_lead = ""
        points_md = ""
        if informative_sentences:
            first_s = informative_sentences[0]
            definition_lead = f"**Definition & Overview:** {first_s}\n\n"
            rest_s = informative_sentences[1:4]
            if rest_s:
                points_md = "\n".join([f"* **Key Principle:** {s}" for s in rest_s])
            else:
                points_md = f"* **Core Context:** Grounded in your lecture materials for {course_badge} ({doc_refs})."
        else:
            definition_lead = f"**Definition & Overview:** In {course_badge}, **{topic_title}** is a core syllabus concept analyzing system architecture, governing invariants, and operational trade-offs.\n\n"
            points_md = f"* **Fundamental Concept:** Analyzes structural properties and operational behaviors specified in {doc_refs}."

        cited_pages_str = ', '.join([f"Page {p.get('page_number', 1)}" for p in context_passages[:2]]) if context_passages else "course notes"

        return f"""### 📖 Course Knowledge Base Synthesis: {topic_title}

**Course Context:** **{course_badge}**  
**Grounded Sources:** {doc_refs} | **Academic Level:** {level}

---

#### 1. Definition & Grounded Pedagogical Analysis
Synthesized directly from your verified lecture materials for **{course_badge}**:

{definition_lead}{points_md}

---

#### 2. Authentic Course Excerpts:
{excerpts_md}

---

#### 3. Core Academic Invariants & Exam Takeaways:
* **Mathematical & Operational Correctness:** Relate theoretical constraints directly to the system behaviors defined in your lecture notes.
* **Exam Relevance:** Review the cited pages above ({cited_pages_str}) for specific unit definitions and diagrams prior to university examinations.

---
💡 *You can ask for an intuitive analogy, a concrete numerical walkthrough, or launch an adaptive practice quiz on this topic!*"""

    def _explain_computer_networks(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        prompt_lower = prompt.lower()
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`CN 1.1.pdf`):\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        if "mesh" in prompt_lower or "topology" in prompt_lower or "star" in prompt_lower or "bus" in prompt_lower or "ring" in prompt_lower:
            return f"""### 🌐 Physical Network Topologies & Architecture (22CS502: Unit 1)

**Academic Level:** {level}  
**Curriculum Grounding:** *22CS502: Computer Networks — Unit 1: Topologies & Data Communications (`CN 1.1.pdf`)*

---

#### 1. Definition of Network Topology
The **topology** of a network is the geometric representation of the relationship of all the links and linking devices (nodes) to one another. There are four basic physical topologies:

1. **Mesh Topology:**
   * **Structure:** Every device has a dedicated point-to-point link to every other device.
   * **Formula for Links:** For $n$ devices, the network requires exactly:
     $$\\text{{Number of Physical Links}} = \\frac{{n(n-1)}}{{2}}$$
   * **I/O Ports Required:** Each node requires $n-1$ input/output (I/O) ports.
   * **Advantages:** Dedicated links eliminate traffic congestion; robust (if one link fails, only communication between that pair is affected); high privacy/security.
   * **Disadvantages:** High installation cost, enormous amount of cabling, and hardware requirements.
2. **Star Topology:**
   * **Structure:** Each device has a dedicated point-to-point link to a central controller, commonly called a **hub** or **switch**.
   * **Advantages:** Far less cabling than mesh ($n$ links); easy to install and reconfigure; if one link fails, only that device is affected.
   * **Disadvantages:** Single point of failure (if the central hub goes down, the entire network fails).
3. **Bus Topology:**
   * **Structure:** Multi-point architecture where one long backbone cable links all devices in a network through drop lines and taps.
   * **Advantages:** Ease of installation; minimal cabling.
   * **Disadvantages:** Difficult reconnection and fault isolation; signal reflection at taps; a break in the main cable stops all transmission.
4. **Ring Topology:**
   * **Structure:** Each device has a dedicated point-to-point connection with only the two devices on either side of it. A signal is passed along the ring in one direction using repeaters.
   * **Advantages:** Relatively easy to install and reconfigure; faults can be isolated.
   * **Disadvantages:** Unidirectional traffic; a break in the ring can disable the entire network (mitigated via dual-ring architectures).
{rag_section}
---

#### 2. Exam Key Takeaways
* **Mesh link formula:** $\\frac{{n(n-1)}}{{2}}$ links and $n-1$ ports per node. For $n = 5$ nodes: $\\frac{{5 \\times 4}}{{2}} = 10$ physical duplex cables.
* **Star vs. Bus:** Star uses a central hub (single point of failure); Bus uses a shared backbone with drop lines."""

        return f"""### 🌐 Data Communications & Transmission Modes (22CS502: Unit 1)

**Academic Level:** {level}  
**Curriculum Grounding:** *22CS502: Computer Networks — Unit 1: Data Communications (`CN 1.1.pdf`)*

---

#### 1. Core Components of Data Communications
1. **Message:** The information (data) to be communicated (text, numbers, pictures, audio, video).
2. **Sender:** The device that sends the data message (computer, workstation, telephone handset, camera).
3. **Receiver:** The device that receives the message (computer, printer, monitor).
4. **Transmission Medium:** The physical path by which a message travels from sender to receiver (twisted-pair wire, coaxial cable, fiber-optic cable, radio waves).
5. **Protocol:** A set of governing rules that coordinate data communications, representing an agreement between communicating entities.

---

#### 2. Data Flow Modes (Directionality)
* **Simplex Mode:** Unidirectional communication (one-way street). Only one of the two devices on a link can transmit; the other can only receive (e.g., keyboards, traditional television monitors).
* **Half-Duplex Mode:** Each station can both transmit and receive, but **not at the same time**. When one device is sending, the other can only receive (e.g., Walkie-talkies). The entire link capacity is utilized for each direction.
* **Full-Duplex Mode (Duplex):** Both stations can transmit and receive **simultaneously**. Signals in opposite directions share link capacity through physically separate transmission paths or divided frequency bands (e.g., telephone networks).
{rag_section}
---

#### 3. Key Criteria for Network Effectiveness
* **Performance:** Evaluated via transit time, response time, and throughput vs. delay.
* **Reliability:** Measured by frequency of failure, link recovery time, and robustness in catastrophe.
* **Security:** Protecting data from unauthorized access, modification, and data corruption."""

    def _explain_ai_foundations(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`AI 1.1.pdf`):\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        return f"""### 🤖 Foundations of Artificial Intelligence & Intelligent Agents (21CB603: Unit 1)

**Academic Level:** {level}  
**Curriculum Grounding:** *21CB603: Artificial Intelligence — Unit 1: Introduction & Rational Agents (`AI 1.1.pdf`)*

---

#### 1. Definitions & The Four Approaches to AI
According to Russell & Norvig's foundational curriculum, Artificial Intelligence spans four historical perspectives across two dimensions (Human vs. Rational, and Thought vs. Action):
1. **Thinking Humanly (Cognitive Modeling):** Determining how human cognition operates through introspection, psychological experiments, or brain imaging (fMRI) and expressing that reasoning as computer algorithms.
2. **Thinking Rationally (Laws of Thought):** Codifying correct reasoning using formal symbolic logic and syllogisms (e.g., Aristotle's deductive logic: *Socrates is a man; all men are mortal; therefore Socrates is mortal*).
3. **Acting Humanly (The Turing Test Approach):** Alan Turing (1950) proposed operational intelligence via the **Imitation Game**:
   * An AI passes the Turing Test if a human interrogator cannot distinguish whether written responses originate from a computer or human.
   * Required capabilities: Natural Language Processing (NLP), Knowledge Representation, Automated Reasoning, and Machine Learning.
4. **Acting Rationally (The Rational Agent Approach):** The modern standard. An agent is an entity that perceives its environment through sensors and acts through actuators to maximize its expected performance measure.

---

#### 2. The PEAS Framework for Task Environments
When engineering an intelligent rational agent, define its **PEAS** descriptor:
* **P (Performance Measure):** The criteria that determines how successful an agent is (e.g. For automated taxi: safety, speed, passenger comfort, legal compliance).
* **E (Environment):** The operational world in which the agent navigates (e.g. Roads, traffic, pedestrians, weather).
* **A (Actuators):** The mechanisms through which the agent acts upon the environment (e.g. Steering wheel, accelerator, brakes, display).
* **S (Sensors):** The devices through which the agent receives percepts (e.g. Cameras, LiDAR, radar, GPS, speedometer).
{rag_section}
---

#### 3. Agent Architecture Progression
* **Simple Reflex Agent:** Selects actions based only on current percept ($condition \\to action$ rules), ignoring history.
* **Model-Based Reflex Agent:** Maintains internal state to track unseen aspects of the environment.
* **Goal-Based Agent:** Combines state information with explicit goal descriptions to find valid action sequences.
* **Utility-Based Agent:** Uses a utility function mapping states to real numbers to choose the highest quality trade-off when competing goals exist."""

    def _explain_big_data(
        self,
        prompt: str,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`BD U3.1.pdf`):\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        return f"""### 📊 Big Data Analytics, MapReduce & HDFS (22AI602: Unit 3)

**Academic Level:** {level}  
**Curriculum Grounding:** *22AI602: Big Data Analytics — Unit 3: MapReduce Workflows (`BD U3.1.pdf`)*

---

#### 1. The 5 V's of Big Data
* **Volume:** Immense scale of data generated (terabytes to petabytes).
* **Velocity:** High frequency and rate at which data is ingested and processed in real time (e.g., IoT telemetry, stock trades).
* **Variety:** Diverse structural representations (Structured SQL, Semi-structured JSON/XML, Unstructured video/text).
* **Veracity:** Trustworthiness, data quality, cleanliness, and noise level.
* **Value:** The ultimate business or scientific insights extracted through statistical modeling.

---

#### 2. The MapReduce Computational Paradigm
MapReduce processes petabytes of data across distributed commodity clusters in parallel:
1. **Map Phase:**
   * Input data is split into independent chunks.
   * The `map()` function processes each record and outputs intermediate key-value pairs:
     $$\\text{{map}}(k_1, v_1) \\longrightarrow \\text{{list}}(k_2, v_2)$$
2. **Shuffle and Sort Phase:**
   * The framework partitions intermediate key-value pairs by key, sorting and transferring all values associated with the same key to the same reducer node.
3. **Reduce Phase:**
   * The `reduce()` function aggregates or synthesizes intermediate values sharing the same key:
     $$\\text{{reduce}}(k_2, \\text{{list}}(v_2)) \\longrightarrow \\text{{list}}(k_3, v_3)$$

---

#### 3. HDFS Architecture (Hadoop Distributed File System)
* **Master-Worker Design:**
  * **NameNode (Master):** Manages file system namespace, directory trees, block locations, and replication metadata.
  * **DataNodes (Workers):** Store and retrieve physical data blocks (typically 128MB each) on local disks, performing read/write operations and sending periodic Heartbeats and Blockreports to the NameNode.
* **Fault Tolerance:** Blocks are replicated across multiple physical racks (default replication factor = 3).
{rag_section}
---

#### 4. Exam Key Takeaway
MapReduce moves the **computation to the data** rather than transferring massive datasets across the network to a central compute node."""

    def _generic_academic_explanation(self, prompt: str, level: str, rag_note: str) -> str:
        topic_title = prompt.strip().capitalize()
        if len(topic_title) > 60:
            topic_title = topic_title[:57] + "..."
        return f"""### 📚 Academic Synthesis: {topic_title}

**Academic Level:** {level}  
**Focus:** Pedagogical breakdown, theoretical principles, and operational applications.
{rag_note}

---

#### 1. Core Conceptual Foundation
Understanding **{topic_title}** requires recognizing its foundational role in software engineering, applied mathematics, and computational systems:
* **Functional Purpose:** Manages computational complexity, guarantees algorithmic invariants, and maintains deterministic execution across boundaries.
* **Mathematical Invariant:** Properties that remain invariant under transformation states.

#### 2. Operational Mechanics & Trade-offs
* **Representation:** How state transitions and data flows are modeled.
* **Performance Trade-offs:** Algorithmic complexity (time $\\mathcal{{O}}$ and space $\\mathcal{{O}}$), latency vs. throughput, or bias vs. variance.
* **Boundary Validation:** Verifying behavior under degenerate inputs, empty states, and saturation thresholds.

#### 3. Examination Takeaways
* Connect theoretical proofs and algorithmic definitions directly to standard semester exam formats.
* Review unit lecture slides in your **Knowledge Base** tab for exact diagram representations and derivations.

---
💡 *Feel free to ask for a practice problem, code snippet, or a step-by-step numerical walkthrough!*"""

    def _explain_machine_learning(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        subj_name = subject_info.get("name", "Machine Learning") if subject_info else "Machine Learning"
        subj_code = subject_info.get("code", "22AI503") if subject_info else "22AI503"
        course_badge = f"{subj_code}: {subj_name}"

        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`ML U1.1(2).pdf`):\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = r"""### 🤖 What is Machine Learning? (__COURSE__: Unit 1)

**Academic Level:** __LEVEL__  
**Syllabus Reference:** *__COURSE__ — Unit 1: Introduction & Learning Systems (`ML U1.1(2).pdf`)*

---

#### 1. Core Definition
**Machine Learning (ML)** is the scientific study and engineering discipline focused on creating algorithms that allow computer systems to **learn from data and experience ($E$)** to improve their performance ($P$) on specific tasks ($T$) without being explicitly programmed with rigid static rules.

> **Tom Mitchell's Formal Operational Definition:**  
> *"A computer program is said to learn from experience $E$ with respect to some class of tasks $T$ and performance measure $P$, if its performance at tasks in $T$, as measured by $P$, improves with experience $E$."*  
> * **Task ($T$):** Playing checkers, classifying medical images, filtering spam.  
> * **Performance ($P$):** Percent of games won, diagnostic classification accuracy.  
> * **Experience ($E$):** Historical games played, labeled patient records.

---

#### 2. The Three Primary Learning Paradigms
1. **Supervised Learning:**
   * The algorithm learns from **labeled training examples** $(x_i, y_i)$.
   * *Tasks:* Classification (discrete classes, e.g., fraud detection) and Regression (continuous values, e.g., house price forecasting).
2. **Unsupervised Learning:**
   * The algorithm discovers inherent patterns, groupings, or representations from **unlabeled data** $\{x_i\}$.
   * *Tasks:* Clustering ($k$-Means, hierarchical), Dimensionality Reduction (PCA, t-SNE).
3. **Reinforcement Learning (RL):**
   * An **agent** interacts with an environment, taking actions ($A$) to transition states ($S$) and maximize a cumulative scalar **reward signal ($R$)**.
   * *Tasks:* Autonomous robotics, game playing (AlphaGo), dynamic resource scheduling.

---

#### 3. Real-World Walkthrough: Email Spam Filtering
* **Traditional Approach:** Writing thousands of manual if-else rules checking for keywords like `"lottery"` or `"wire transfer"`. Spammers easily bypass rules by misspelling (`"w1re"`).
* **Machine Learning Approach:** A Naive Bayes or Logistic Regression model computes conditional probabilities $P(\text{Spam} \mid \text{Words})$ over millions of historical emails, continuously adjusting its weights as spam patterns evolve.
__RAG__
---

#### 4. Exam Key Takeaway
For university examinations, always contrast ML with traditional software:  
*Traditional:* $\text{Data} + \text{Program} \longrightarrow \text{Output}$  
*Machine Learning:* $\text{Data} + \text{Output (Labels)} \longrightarrow \text{Learned Program (Model)}$"""
        return text.replace("__LEVEL__", level).replace("__COURSE__", course_badge).replace("__RAG__", rag_section)

    def _explain_ai_vs_ml(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts:\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = f"""### 🧠 Artificial Intelligence vs. Machine Learning: Structural Comparison

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *21CB603: Artificial Intelligence (`AI 1.1.pdf`) vs. 22AI503: Machine Learning (`ML U1.1(2).pdf`)*

---

#### 1. The Core Hierarchy & Scope
Artificial Intelligence (AI) and Machine Learning (ML) are not competing alternatives—**Machine Learning is a specialized subfield of Artificial Intelligence**:

$$\\text{{Deep Learning (DL)}} \\subset \\text{{Machine Learning (ML)}} \\subset \\text{{Artificial Intelligence (AI)}}$$

* **Artificial Intelligence (Broad Umbrella):** The overarching science of engineering intelligent machines capable of performing tasks that typically require human cognition—such as problem-solving, symbolic deduction, planning, natural language comprehension, and perception.
* **Machine Learning (The Learning Engine):** The specific methodology within AI that achieves intelligence by training mathematical models on empirical datasets rather than hardcoding procedural logic.

---

#### 2. Comparative Matrix

| Dimension | Artificial Intelligence (AI) | Machine Learning (ML) |
|---|---|---|
| **Primary Goal** | Simulate human rationality or engineer rational agents that maximize expected utility. | Enable systems to extract generalizable patterns from sample data to make accurate predictions. |
| **Approach Spectrum** | Includes knowledge graphs, formal logic, $A^*$ search, expert systems, AND statistical models. | Exclusively statistical, optimization-based, and probabilistic algorithms. |
| **Data Dependence** | Can function without big data (e.g., rule-based inference engines, chess search trees). | Completely reliant on quality and quantity of empirical data for model parameter fitting. |
| **Course Reference** | **21CB603:** Rational Agents, PEAS framework, Laws of Thought, Turing Test. | **22AI503:** Supervised/Unsupervised, Gradient Descent, Overfitting, Loss functions. |
{rag_section}
---

#### 3. Concrete Example: Autonomous Driving
* **The AI System:** The entire self-driving vehicle orchestrator. It manages route planning ($A^*$ search), traffic rule compliance (symbolic logic), actuator controls, and high-level decisions (*"Yield at intersection"*).
* **The ML Subsystems:** The computer vision modules (Convolutional Neural Networks) trained on millions of labeled road images to classify pedestrian bounding boxes and lane dividers.

---

💡 *Exam Tip:* Remember that an expert system (like a medical diagnosis rule engine with 10,000 if-then clauses) is AI, but it is **not** Machine Learning because it cannot learn or adjust its weights from new data."""
        return text.replace("__LEVEL__", level)

    def _explain_overfitting(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        subj_name = subject_info.get("name", "Machine Learning") if subject_info else "Machine Learning"
        subj_code = subject_info.get("code", "22AI503") if subject_info else "22AI503"
        course_badge = f"{subj_code}: {subj_name}"

        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`ML U1.1(2).pdf`):\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = f"""### ⚠️ Why Does Overfitting Happen? Analysis & Mitigation

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *{course_badge} — Unit 1: Challenges in ML (`ML U1.1(2).pdf`, Page 5)*

---

#### 1. What is Overfitting?
**Overfitting** occurs when a machine learning model learns the training data **too well**, including its random noise, idiosyncrasies, and outliers, rather than learning the true underlying mathematical distribution.

* **Symptom:** **Near-zero training error** ($E_{{\\text{{train}}}} \\approx 0$), but **high test/generalization error** ($E_{{\\text{{val}}}} \\gg 0$).
* **Statistical Diagnosis:** The model exhibits **High Variance** and **Low Bias**.

---

#### 2. The Student Analogy: The "Rote Memorizer"
* **Healthy Learning:** A student studies 50 practice calculus problems, understands the fundamental differentiation rules, and scores 92% on completely unseen final exam questions.
* **Overfitting:** A student memorizes the exact numbers, question typography, and punctuation of the 50 practice problems without understanding derivatives. When given identical practice questions, they score 100%; on the actual exam with different numbers, they score 30%.

---

#### 3. Root Causes
1. **Model Complexity Too High:** Using a high-degree polynomial (e.g., degree 15 on 20 data points) or a deep neural network with millions of parameters for a simple dataset. The model has enough degrees of freedom to interpolate every data point.
2. **Insufficient Training Dataset Size:** When the volume of samples is too small relative to the feature space (Curse of Dimensionality), the model easily memorizes noise.
3. **Noisy / Mislabelled Data:** Corrupted labels or sensor artifacts that the model treats as ground truth.
4. **Excessive Training Iterations (Over-training):** Running gradient descent for too many epochs without early stopping.
{rag_section}
---

#### 4. Practical Engineering Solutions (Exam Checklist)
* **Regularization ($L_1$ Lasso, $L_2$ Ridge):** Add a penalty term $\\lambda \\sum w_i^2$ to the loss function to constrain weight magnitudes.
* **Cross-Validation ($k$-Fold):** Partition data into $k$ subsets to ensure consistent validation across rotations.
* **Early Stopping:** Monitor validation loss during training and halt optimization the moment validation loss starts climbing.
* **Dropout (Neural Networks):** Randomly deactivate a fraction $p$ (e.g., 20–50%) of neurons during each forward-backward pass.
* **Data Augmentation:** Artificially expand dataset diversity (rotations, scaling, noise injection)."""
        return text.replace("__LEVEL__", level)

    def _explain_tcp_udp(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`CN 1.1.pdf`):\n"
            for p in context_passages[:2]:
                clean_text = p['text'].replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 250:
                    clean_text = clean_text[:247] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = f"""### 🌐 TCP vs. UDP: Comprehensive Protocol Comparison & Examples

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22CS502: Computer Networks — Transport Layer Abstractions (`CN 1.1.pdf`)*

---

#### 1. Core Architectural Role
In the Internet (TCP/IP) protocol suite, both **TCP (Transmission Control Protocol)** and **UDP (User Datagram Protocol)** operate at the **Transport Layer (Layer 4)**. They provide process-to-process communication using **port numbers**, but offer opposite engineering trade-offs between **reliability** and **latency**.

---

#### 2. Architectural Differences

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Connection Paradigm** | **Connection-oriented** (requires 3-way handshake: SYN $\\to$ SYN-ACK $\\to$ ACK). | **Connectionless** (packets sent immediately without setup). |
| **Reliability Guarantee** | **Guaranteed Delivery:** Acknowledges receipts, detects loss, retransmits missing segments. | **Best-effort Delivery:** No acknowledgments, no retransmission; packets may be lost or duplicate. |
| **Packet Ordering** | **Strict In-Order Delivery:** Segments have 32-bit sequence numbers and are reassembled at receiver. | **No Ordering:** Datagrams arrive independently and out of order. |
| **Header Overhead** | **Heavy:** 20 to 60 bytes header containing flags, window size, checksum, urgent pointer. | **Lightweight:** Exactly 8 bytes header (Source Port, Dest Port, Length, Checksum). |
| **Congestion & Flow Control** | **Yes:** Sliding window mechanism, Slow Start, AIMD, Fast Retransmit. | **None:** Transmits at whatever rate the application injects data. |
{rag_section}
---

#### 3. Intuitive Real-World Analogies & Applications
* **TCP = Certified Registered Postal Mail:**  
  * *Analogy:* You send legal documents where the recipient must sign a return receipt. If the letter is lost in transit, the post office notifies you and resends it until receipt is verified.  
  * *Applications:* **Web Browsing (HTTP/HTTPS)**, **File Transfer (FTP/SFTP)**, **Email (SMTP/IMAP)**, **Remote Terminal (SSH)**. Loss of a single bit could corrupt an entire file or executable.
* **UDP = Live Radio / Megaphone Broadcast:**  
  * *Analogy:* A sports commentator shouting play-by-play over the radio. If static causes you to miss 1 word from 2 seconds ago, re-announcing it 5 seconds later is useless—you only care about what is happening right now.  
  * *Applications:* **Live Video Streaming**, **Online Multiplayer Gaming**, **VoIP (Voice over IP / Zoom / Discord)**, **DNS Lookups (UDP port 53)**."""
        return text.replace("__LEVEL__", level)

    def _explain_cloud_computing(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`CC 1.1.pdf`):\n"
            for p in context_passages[:2]:
                snip = p.get('snippet') or p['text']
                clean_text = snip.replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 280:
                    clean_text = clean_text[:277] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = f"""### ☁️ What is Cloud Computing? NIST Standards & Architectural Models

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22IT402: Cloud Computing — Unit 1: Principles & Service Models (`CC 1.1.pdf`, Pages 1–2)*

---

#### 1. Formal NIST Definition
According to the **National Institute of Standards and Technology (NIST SP 800-145)**:
> *"Cloud computing is a model for enabling ubiquitous, convenient, on-demand network access to a shared pool of configurable computing resources (e.g., networks, servers, storage, applications, and services) that can be rapidly provisioned and released with minimal management effort or service provider interaction."*

---

#### 2. The 5 Essential Characteristics (NIST Standard)
1. **On-Demand Self-Service:** Consumers provision compute power and storage autonomously without human intervention from the service provider.
2. **Broad Network Access:** Capabilities are available over the network and accessed through standard mechanisms (web browsers, mobile apps).
3. **Resource Pooling:** Multi-tenant model where physical and virtual resources are dynamically assigned and reassigned according to consumer demand.
4. **Rapid Elasticity:** Capabilities can be elastically provisioned and released to scale rapidly outward and inward commensurate with demand.
5. **Measured Service:** Resource usage is monitored, controlled, and billed based on a pay-as-you-go metering system.

---

#### 3. The 3 Primary Service Models (SPI Tier)
* **IaaS (Infrastructure as a Service):**  
  * *You Manage:* OS, middleware, runtime, data, applications.  
  * *Provider Manages:* Virtualization, servers, storage, networking.  
  * *Examples:* AWS EC2, Google Compute Engine, Microsoft Azure VMs.
* **PaaS (Platform as a Service):**  
  * *You Manage:* Applications and data.  
  * *Provider Manages:* OS, runtime, hardware, networking, scaling.  
  * *Examples:* AWS Elastic Beanstalk, Heroku, Google App Engine.
* **SaaS (Software as a Service):**  
  * *You Manage:* Nothing (you are an end-user).  
  * *Provider Manages:* The entire software stack, updates, infrastructure, and availability.  
  * *Examples:* Google Workspace (Docs, Gmail), Microsoft 365, Salesforce.
{rag_section}
---

#### 4. Exam Key Takeaways
* **NIST Definition Essentials:** Ubiquitous, on-demand, shared pool of configurable resources, rapidly provisioned with minimal management effort.
* **SPI Tier Hierarchy:** IaaS provides raw hardware (VMs/VPCs); PaaS provides runtime/frameworks; SaaS delivers turnkey applications to end users."""
        return text.replace("__LEVEL__", level)

    def _explain_hybrid_cloud(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`CC 1.1.pdf`):\n"
            for p in context_passages[:2]:
                snip = p.get('snippet') or p['text']
                clean_text = snip.replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 280:
                    clean_text = clean_text[:277] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = f"""### ☁️ Hybrid Cloud Architecture & Cloud Bursting (22IT402: Unit 1)

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22IT402: Cloud Computing — Unit 1: Cloud Deployment Models (`CC 1.1.pdf`, Pages 3–4)*

---

#### 1. What is Hybrid Cloud?
According to your official course curriculum:
> *"A **hybrid cloud** merges public and private cloud models. The two distinct environments remain separate entities but are bound together by standardized networking technologies and encrypted data pipes. This allows data and application states to move seamlessly between them."*

* **Private Component:** Dedicated, single-tenant infrastructure located on-premises or hosted by a specialized vendor. Provides total data sovereignty, custom security governance, and predictability.
* **Public Component:** Multi-tenant infrastructure provisioned on demand from commercial hyperscalers (e.g., AWS, Microsoft Azure, Google Cloud). Provides massive scalability and elastic compute capacity.

---

#### 2. Key Architectural Mechanisms
1. **Hybrid Networking & Secure Interconnects:**
   * Connection is established using encrypted **Virtual Private Network (VPN)** tunnels over the public internet (IPsec) for moderate throughput.
   * For enterprise-grade reliability and low latency, organizations deploy dedicated, private fiber-optic cross-connects (such as **AWS Direct Connect** or **Azure ExpressRoute**) that bypass the public internet entirely.
2. **Cloud Bursting (Dynamic Elasticity Trigger):**
   * An application deployment configuration where an organization runs its baseline workloads within the private cloud environment.
   * When user demand or processing utilization spikes close to local capacity limits (e.g., end-of-quarter reporting or flash-sale traffic), the application **automatically overflows ("bursts")** into external public cloud nodes to maintain performance without crashing.
3. **Workload Partitioning & Tiered Compliance:**
   * Sensitive persistent data (e.g., PII, healthcare records, core banking ledgers) remains strictly inside the private cloud to comply with regulations (GDPR, HIPAA).
   * Ephemeral front-end web services, stateless microservices, and high-performance computing (HPC) analytics are dispatched to public cloud nodes.

---

#### 3. Operational Trade-offs & Challenges
* **Advantages:** Avoids over-provisioning private hardware for peak loads; preserves compliance; enables disaster recovery and rapid testing.
* **Challenges:** Network configuration complexity, data transfer egress charges, cross-cloud latency synchronization, and unified identity management (IAM).
{rag_section}
---

#### 4. Exam Key Takeaways
* **Core Definition:** Merges private and public cloud models into a federated system bound by standardized networking.
* **Cloud Bursting Formula:** Baseline on private cloud + excess peak traffic redirected to public cloud.
* **Physical Connectivity:** Direct Connect / ExpressRoute (private fiber) or IPsec VPN."""
        return text.replace("__LEVEL__", level)

    def _explain_virtualization(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`CC 1.1.pdf`):\n"
            for p in context_passages[:2]:
                snip = p.get('snippet') or p['text']
                clean_text = snip.replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 280:
                    clean_text = clean_text[:277] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = f"""### 🖥️ Virtualization: The Foundational Engine of Cloud Computing (22IT402: Unit 1)

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22IT402: Cloud Computing — Unit 1: Virtualization & Infrastructure Slicing (`CC 1.1.pdf`, Page 6)*

---

#### 1. What is Virtualization?
In your course curriculum, **virtualization** is described as the foundational **"Secret Sauce"** of cloud computing:
> *"Instead of dedicating one physical computer to one customer, cloud providers use software called a **hypervisor** to slice up one massive physical server into dozens of secure, independent **virtual machines** (VMs). This is why resource allocation is instant and affordable."*

* **Hardware Abstraction:** Decouples the operating system and applications from the underlying physical hardware.
* **Resource Pooling:** Slices physical CPU cores, RAM, storage, and network interfaces into isolated virtual instances.
* **Multi-Tenancy:** Enables multiple distinct customers to safely share the same physical silicon without data leakage.

---

#### 2. The Hypervisor (Virtual Machine Monitor - VMM)
The core enabling software component is the **Hypervisor**:
1. **Type 1 Hypervisor (Bare-Metal):**
   * Runs directly on the physical host machine's bare metal without an intermediate operating system.
   * *Examples:* VMware ESXi, KVM (Kernel-based Virtual Machine), Xen, Microsoft Hyper-V.
   * *Use Case:* Enterprise cloud data centers (AWS, GCP, Azure) where maximum I/O throughput and low overhead are mandatory.
2. **Type 2 Hypervisor (Hosted):**
   * Runs as an application layer on top of a conventional host operating system (Windows, macOS, Linux).
   * *Examples:* Oracle VirtualBox, VMware Workstation.
   * *Use Case:* Local student development, software testing, and legacy application sandboxing.

---

#### 3. The Digital Utility Grid Analogy
From your course lecture notes:
> *"You don't build a power plant just to turn on a light bulb; you plug into a grid and pay for the electricity you use. The cloud is simply a **digital utility grid** for computing power."*
{rag_section}
---

#### 4. Exam Key Takeaways
* **Hypervisor Role:** Mediates access between virtual guest operating systems and physical hardware.
* **Type 1 vs. Type 2:** Type 1 sits directly on bare hardware; Type 2 requires a host operating system.
* **Cloud Enabler:** Virtualization is what transforms static physical machines into elastic, poolable IaaS compute instances."""
        return text.replace("__LEVEL__", level)

    def _explain_cloud_advantages(
        self,
        level: str,
        context_passages: List[Dict[str, Any]] = None,
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        rag_section = ""
        if context_passages:
            rag_section = "\n\n#### 📚 Grounded Course Excerpts (`CC 1.1.pdf`):\n"
            for p in context_passages[:2]:
                snip = p.get('snippet') or p['text']
                clean_text = snip.replace('\u25cf', '•').replace('\u2714', '✔').strip()
                if len(clean_text) > 280:
                    clean_text = clean_text[:277] + "..."
                rag_section += f"> 📄 **[{p['filename']} — Page {p.get('page_number', 1)}]**\n> \"{clean_text}\"\n>\n"

        text = f"""### 🚀 Advantages & Strategic Economics of Cloud Computing (22IT402: Unit 1)

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22IT402: Cloud Computing — Unit 1: Cloud Principles & Trade-offs (`CC 1.1.pdf`, Pages 1–2)*

---

#### 1. Core Economic Advantages
* **Elimination of Capital Expenditures (CapEx $\\to$ OpEx):**  
  Organizations eliminate massive upfront capital investments in physical data centers, server racks, backup generators, and cooling infrastructure. Costs become variable operational expenses paid on a monthly utility basis.
* **Pay-As-You-Go (Measured Service):**  
  Compute power, storage, and networking are metered down to the second or gigabyte. Unused resources can be de-provisioned instantly to halt billing.
* **Optimized Engineering Focus:**  
  Internal IT teams no longer spend valuable engineering hours racking hardware, replacing failed disk drives, or applying firmware patches; they focus purely on customer software and application differentiation.

---

#### 2. Technical & Architectural Advantages
1. **Rapid Elasticity:** Resources dynamically scale outward to handle unanticipated demand surges and scale inward during off-peak hours without over-provisioning idle hardware.
2. **Global Scalability & Broad Access:** Applications deploy globally across multi-region availability zones within minutes, delivering low-latency service worldwide.
3. **High Availability & Fault Tolerance:** Cloud providers offer automated failover, distributed backups, and multi-datacenter replication, ensuring $99.99\\%$ uptime SLAs.

---

#### 3. Trade-offs & Detailed Engineering Constraints
According to your course materials, moving to public cloud introduces specific engineering trade-offs:
* **The Noisy Neighbor Effect:** In multi-tenant environments, other tenants sharing the same physical silicon can cause unpredictable latency and I/O contention.
* **Data Sovereignty & Compliance:** Storing regulated data (GDPR, HIPAA) on shared infrastructure requires careful encryption and geographical region locking.
* **Long-Term OpEx Cost Curves:** For predictable, 24/7 steady-state enterprise workloads, cumulative multi-year cloud consumption can sometimes exceed the amortized cost of owned on-premises hardware.
{rag_section}
---

#### 4. Exam Key Takeaways
* **Financial Shift:** Shift from upfront CapEx (hardware purchase) to flexible OpEx (pay-as-you-go consumption).
* **Elasticity vs. Scalability:** Elasticity is dynamic automatic scaling in response to fluctuating load; Scalability is the general architectural capacity to grow."""
        return text.replace("__LEVEL__", level)

    def _explain_step_by_step(
        self,
        prompt: str,
        last_turn_text: str,
        level: str,
        context_passages: List[Dict[str, Any]],
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        topic_hint = "the subject concept"
        if "gradient descent" in last_turn_text:
            topic_hint = "Gradient Descent Optimization"
            body = r"""1. **Initialize Parameters:** Start with random initial weights $W_0$ and bias $b_0$, and select learning rate $\alpha$.
2. **Forward Computation:** Compute predictions $\hat{y} = f(X, W)$ and evaluate the scalar loss $J(W)$.
3. **Compute Gradients:** Calculate the partial derivatives $\nabla J(W) = \frac{\partial J}{\partial W}$ showing the direction of steepest increase.
4. **Update Parameters:** Adjust weights opposite to the gradient: $W_{t+1} = W_t - \alpha \nabla J(W_t)$.
5. **Iterate to Convergence:** Repeat steps 2–4 until gradient magnitude $\|\nabla J\| < \epsilon$ or maximum epochs reached."""
        elif "backprop" in last_turn_text:
            topic_hint = "Backpropagation Algorithm"
            body = r"""1. **Forward Pass:** Feed input vector $x$ through network layers to compute activations $a^{[l]} = \sigma(z^{[l]})$ up to the output layer $\hat{y}$.
2. **Output Error Evaluation:** Calculate error vector $\delta^{[L]} = \nabla_a J \odot \sigma'(z^{[L]})$.
3. **Backward Error Propagation:** Propagate error backward layer by layer: $\delta^{[l]} = ((W^{[l+1]})^T \delta^{[l+1]}) \odot \sigma'(z^{[l]})$.
4. **Weight Gradient Evaluation:** Calculate gradient with respect to weights: $\frac{\partial J}{\partial W^{[l]}} = \delta^{[l]} (a^{[l-1]})^T$.
5. **Parameter Update:** Update each layer's weights using gradient descent."""
        else:
            body = r"""1. **Foundational Framing:** Identify the inputs, environmental assumptions, and operational constraints.
2. **Mathematical Formulation:** Express the relationship using formal governing equations and invariants.
3. **Algorithmic Execution:** Trace the step-by-step transformation from state $S_t$ to $S_{t+1}$.
4. **Boundary Condition Verification:** Check edge cases (e.g., empty inputs, maximum capacity, divergence thresholds).
5. **Empirical Validation:** Verify correctness through test benchmarks or diagnostic quiz evaluation."""

        return f"""### 🪜 Step-by-Step Breakdown: {topic_hint}

**Academic Level:** {level}  
**Focus:** Detailed analytical procedure and operational sequence.

---

{body}

---
💡 *Would you like to walk through a concrete numerical example with real values?*"""

    def _provide_another_example(
        self,
        prompt: str,
        last_turn_text: str,
        level: str,
        context_passages: List[Dict[str, Any]],
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        return f"""### 💡 Additional Practical Example & Application

**Academic Level:** {level}  
**Instruction:** *Providing an alternative, concrete illustrative case study.*

---

#### 🌟 Case Study: Real-World Implementation
Consider an e-commerce platform processing holiday peak traffic:
* **The Challenge:** Thousands of concurrent user checkout requests with unpredictable latency spikes.
* **How the Principle Applies:**
  * If using **TCP**, every checkout payment payload guarantees zero dropped packets through acknowledgments and sequence tracking.
  * If using **Cloud Elasticity**, auto-scaling groups dynamically spin up 50 additional compute nodes when CPU utilization exceeds 75%, and terminate them when traffic subsides to minimize costs.
  * If using **Supervised Learning**, a fraud detection classifier scores each transaction in real time against historical chargeback patterns.

---

#### 🔑 Why This Illustrates the Concept
Notice how the theoretical trade-off dictates the practical engineering decision: you sacrifice a small amount of setup latency to guarantee complete data integrity.

---
💡 *Would you like an exam-style multiple choice question on this scenario?*"""

    def _make_previous_simpler(self, last_turn_text: str, level: str, prompt: str = "") -> str:
        return f"""### 🧸 Ultra-Simple Intuition (In Plain English)

**Concept Simplification Mode:** *Beginner-friendly mental model with zero unnecessary jargon.*

---

#### 🎯 The One-Sentence Summary
Think of this concept like an everyday kitchen appliance or road trip navigation system:
1. **The Goal:** Get from Point A to Point B without crashing.
2. **The Sensor:** Check how far off-course you are right now (the error).
3. **The Adjustment:** Turn the steering wheel slightly back toward the center line. If you turn too violently, you swerve off the road (high learning rate); if you turn too gently, you never correct in time (low learning rate).

#### 📌 The 3 Things You Must Remember for Exams:
* **Input:** What you start with.
* **Rule:** What adjusts the knobs.
* **Output:** The desired result with minimum error.

---
💡 *Does this clear up the intuition? Let me know if you want to connect it back to the textbook equations!*"""

    def _summarize_for_exam(
        self,
        prompt: str,
        last_turn_text: str,
        level: str,
        context_passages: List[Dict[str, Any]],
        subject_info: Optional[Dict[str, Any]] = None
    ) -> str:
        subj_name = subject_info.get("name", "Curriculum") if subject_info else "Curriculum"
        subj_code = subject_info.get("code", "") if subject_info else ""
        course_badge = f"{subj_code}: {subj_name}" if subj_code else subj_name

        citations = ""
        if context_passages:
            citations = f"\n**Course:** **{course_badge}** | **Syllabus Sources:** " + ", ".join([f"`{p['filename']} (P.{p.get('page_number', 1)})`" for p in context_passages[:2]])

        return f"""### 📋 Quick Revision Summary for Examinations

**Academic Level:** {level}  
**Format:** *High-yield revision flash sheet.*{citations}

---

#### 1. Fundamental Definition
The primary definition to write in short-answer questions: state the operational purpose, the inputs/outputs, and the standard governing framework.

#### 2. Key Formulas & Invariants
* Ensure all notation (indices, dimensions, scalar vs. vector) is explicitly defined.
* State boundary conditions (what happens when inputs are 0 or approach $\\infty$).

#### 3. Typical Exam Questions & Pitfalls
* **Question Type 1 (Distinction):** Often asks to contrast two approaches (e.g., TCP vs. UDP, Supervised vs. Unsupervised, AI vs. ML). Always format in a structured table.
* **Question Type 2 (Trade-offs):** Explain why you cannot have both extremes simultaneously (Bias-Variance tradeoff, Latency vs. Reliability).
* **Common Student Mistake:** Forgetting to mention why the mechanism is needed instead of a simple static heuristic.

---
💡 *You can test your mastery right now by clicking 'Practice Quiz' in the Quiz module!*"""

    def explain_quiz_mistake(
        self,
        question_text: str,
        options: Dict[str, str],
        selected_option: str,
        correct_option: str,
        standard_explanation: str,
        course_name: str,
        topic: str,
        context_passages: Optional[List[Dict[str, Any]]] = None,
        student_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes a rich, pedagogically rigorous explanation for a student's incorrect quiz answer.
        Tries Gemini if configured; otherwise uses deterministic educational reasoning.
        """
        student_profile = student_profile or {}
        context_passages = context_passages or []
        sel_text = options.get(selected_option, selected_option)
        corr_text = options.get(correct_option, correct_option)

        # 1. Try Gemini if configured
        if self.gemini_available:
            try:
                model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
                model = self.genai.GenerativeModel(model_name)
                rag_block = ""
                if context_passages:
                    rag_block = "\n".join([f"[{p.get('filename', 'Course Note')}, P.{p.get('page_number', 1)}]: {p.get('text', '')[:300]}" for p in context_passages[:3]])

                prompt = (
                    f"You are an expert university professor explaining an assessment mistake to an undergraduate student.\n"
                    f"Course: {course_name}\n"
                    f"Topic: {topic}\n"
                    f"Question: \"{question_text}\"\n"
                    f"Options:\n"
                    f"- A: {options.get('A', '')}\n"
                    f"- B: {options.get('B', '')}\n"
                    f"- C: {options.get('C', '')}\n"
                    f"- D: {options.get('D', '')}\n"
                    f"Student Selected: Option {selected_option} (\"{sel_text}\") [INCORRECT]\n"
                    f"Correct Answer: Option {correct_option} (\"{corr_text}\") [CORRECT]\n"
                    f"Standard Reference Explanation: {standard_explanation}\n"
                    f"Course Material Context:\n{rag_block}\n\n"
                    "Generate a structured explanation in valid JSON format with these exact keys:\n"
                    "{\n"
                    "  \"why_incorrect\": \"Detailed explanation of why Option \" + selected_option + \" is false and what common misconception it represents.\",\n"
                    "  \"correct_concept\": \"Clear statement of the underlying curriculum concept.\",\n"
                    "  \"step_by_step_explanation\": \"3-step pedagogical breakdown explaining how to deduce the right answer.\",\n"
                    "  \"example_or_analogy\": \"An intuitive real-world analogy or illustrative example.\",\n"
                    "  \"tip_to_remember\": \"A concise exam tip or memory anchor to never make this mistake again.\",\n"
                    "  \"citation\": \"Accurate course source reference.\"\n"
                    "}"
                )

                resp = model.generate_content(prompt, request_options={"timeout": 10.0})
                if resp and resp.text:
                    match = re.search(r'\{.*\}', resp.text, re.DOTALL)
                    if match:
                        data = json.loads(match.group(0))
                        if data.get("why_incorrect") and data.get("correct_concept"):
                            return {
                                "why_incorrect": data.get("why_incorrect"),
                                "correct_concept": data.get("correct_concept"),
                                "step_by_step_explanation": data.get("step_by_step_explanation"),
                                "example_or_analogy": data.get("example_or_analogy"),
                                "tip_to_remember": data.get("tip_to_remember"),
                                "citation": data.get("citation") or (context_passages[0]["filename"] if context_passages else course_name),
                                "recommended_topic": topic,
                                "provider": "Gemini 1.5 Flash (Live AI Explanation)"
                            }
            except Exception as err:
                print(f"[AcademicLLMService] Gemini mistake explanation failed, falling back: {err}")

        # 2. Rich Deterministic Academic Explanation Fallback
        citation_str = f"{context_passages[0]['filename']} (Page {context_passages[0].get('page_number', 1)})" if context_passages else f"{course_name} Syllabus Unit 1"
        
        why_incorrect = (
            f"You selected Option {selected_option}: \"{sel_text}\". "
            f"While this option may sound plausible, it represents a common conceptual confusion. "
            f"In {course_name}, this choice fails because it either swaps the directional causality, "
            f"confuses the operational layer, or assumes a constraint that does not apply under standard conditions."
        )

        correct_concept = (
            f"The correct answer is Option {correct_option}: \"{corr_text}\". "
            f"{standard_explanation} "
            f"In the context of '{topic}', this principle guarantees correctness and adheres to formal syllabus specifications."
        )

        step_by_step = (
            f"1. **Analyze the Question Stem:** Identify the core requirement—the prompt specifically asks about '{topic}'.\n"
            f"2. **Eliminate Misconceptions:** Option {selected_option} fails because it contradicts the fundamental theorems of {course_name}.\n"
            f"3. **Validate the Correct Option:** Option {correct_option} directly satisfies the definition and matches the verified course literature."
        )

        analogy = (
            f"Think of {topic} like a formal engineering specification: you cannot substitute a lightweight best-effort component "
            f"when strict guarantees are required by the system design."
        )

        tip = (
            f"Exam Tip for {topic}: Always underline whether the question asks for the primary mechanism vs. a secondary side effect. "
            f"Review Option {correct_option} carefully before final semester assessments."
        )

        return {
            "why_incorrect": why_incorrect,
            "correct_concept": correct_concept,
            "step_by_step_explanation": step_by_step,
            "example_or_analogy": analogy,
            "tip_to_remember": tip,
            "citation": citation_str,
            "recommended_topic": topic,
            "provider": "LearnAI Pedagogical Remediation Engine (Offline)"
        }

llm_service = AcademicLLMService()


