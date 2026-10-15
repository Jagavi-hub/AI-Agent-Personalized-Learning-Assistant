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
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generate academic response. Tries Gemini API if configured; otherwise uses deterministic fallback.
        Supports multi-turn previous conversation context.
        """
        context_passages = context_passages or []
        performance_context = performance_context or {}
        conversation_history = conversation_history or []

        # 1. Try Gemini if configured
        if self.gemini_available:
            try:
                gemini_text = self._call_gemini(
                    prompt, student_profile, action_type, context_passages, performance_context, conversation_history
                )
                if gemini_text and len(gemini_text.strip()) > 20:
                    return {
                        "text": gemini_text,
                        "provider": "Gemini 1.5 Flash (Live API)",
                        "is_fallback": False
                    }
            except Exception as err:
                print(f"[AcademicLLMService] Gemini call failed, falling back: {err}")

        # 2. Deterministic Academic Engine Fallback
        fallback_text = self._generate_academic_fallback(
            prompt, student_profile, action_type, context_passages, performance_context, conversation_history
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
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        student_name = student_profile.get("name", "Student")
        dept = student_profile.get("department", "Computer Science")
        level = student_profile.get("current_skill_level", "Intermediate")
        style = student_profile.get("preferred_learning_style", "Visual & Practical")
        weak_topics = performance_context.get("weak_topics", [])

        # Build prompt with RAG context
        system_instruction = (
            f"You are LearnAI, an expert AI Academic Tutor and conversational assistant for higher education students.\n"
            f"Student Profile:\n"
            f"- Name: {student_name}\n"
            f"- Department: {dept}, Skill Level: {level}\n"
            f"- Preferred Style: {style}\n"
            f"- Identified Weak Areas: {', '.join(weak_topics) if weak_topics else 'None recorded yet'}\n\n"
            f"Instruction:\n"
            f"- Answer the student's exact academic question conversationally and thoroughly.\n"
            f"- If the student asks a follow-up (e.g. 'explain more simply', 'give an example', 'summarize this'), "
            f"use the previous conversation context to provide a direct, relevant answer.\n"
            f"- Structure your answer with clear Markdown headings, lists, bold concepts, examples, and exam takeaways.\n"
            f"- Ground your answer in any provided course excerpts and cite them accurately."
        )

        rag_context = ""
        if context_passages:
            rag_context = "\n\nRetrieved Relevant Academic Documents (Course Knowledge Base):\n"
            for i, p in enumerate(context_passages):
                rag_context += f"--- Source [{p.get('filename', 'Course Material')}, Page {p.get('page_number', 1)}] ---\n{p.get('text', '')}\n"
            rag_context += "\nCite these sources when referring to them in your answer.\n"

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
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        prompt_lower = prompt.lower()
        level = student_profile.get("current_skill_level", "Intermediate")
        weak_topics = performance_context.get("weak_topics", [])
        student_name = student_profile.get("name", "Student")
        conversation_history = conversation_history or []

        # Find recent topic or last turn from conversation history
        last_turn_text = ""
        for turn in reversed(conversation_history):
            if turn.get("content"):
                last_turn_text = turn["content"]
                break

        # Include RAG context notes if available
        rag_note = ""
        if context_passages:
            rag_note = "\n\n> 📚 **Retrieved from Course Knowledge Base:**\n"
            for p in context_passages[:2]:
                rag_note += f"> *[{p['filename']} — Page {p.get('page_number', 1)}]:* \"{p['text'][:220]}...\"\n"

        # 1. Multi-turn Follow-up handling
        if any(term in prompt_lower for term in ["step by step", "step-by-step", "explain step by step"]):
            return self._explain_step_by_step(prompt, last_turn_text, level, context_passages)

        if any(term in prompt_lower for term in ["another example", "give an example", "give me an example", "more examples", "concrete example"]):
            return self._provide_another_example(prompt, last_turn_text, level, context_passages)

        if any(term in prompt_lower for term in ["more simply", "simpler words", "make it simpler", "explain your previous answer more simply", "in simpler terms", "explain that again simply"]):
            return self._make_previous_simpler(last_turn_text, level)

        if any(term in prompt_lower for term in ["summarize this topic", "summarize for my exam", "exam summary", "summary for exam", "exam notes"]):
            return self._summarize_for_exam(prompt, last_turn_text, level, context_passages)

        # 2. Specific Academic Doubt Questions
        # Difference between AI and Machine Learning
        if any(term in prompt_lower for term in ["difference between ai and machine learning", "difference between ai and ml", "ai vs ml", "ai and machine learning difference"]):
            return self._explain_ai_vs_ml(level) + rag_note

        # What is Machine Learning / Core ML
        if any(term in prompt_lower for term in ["what is machine learning", "define machine learning", "what is ml", "how does machine learning work"]):
            return self._explain_machine_learning(level, context_passages) + rag_note

        # Overfitting & Underfitting
        if any(term in prompt_lower for term in ["why does overfitting happen", "overfitting", "underfitting", "over fitting", "how to prevent overfitting"]):
            return self._explain_overfitting(level, context_passages) + rag_note

        # TCP and UDP with examples
        if any(term in prompt_lower for term in ["tcp and udp", "tcp vs udp", "explain tcp", "explain udp", "transmission control protocol", "user datagram protocol"]):
            return self._explain_tcp_udp(level, context_passages) + rag_note

        # What is Cloud Computing
        if any(term in prompt_lower for term in ["what is cloud computing", "cloud computing", "nist cloud", "cloud service models", "iaas paas saas"]):
            return self._explain_cloud_computing(level, context_passages) + rag_note

        # Gradient Descent in simple words
        if "gradient descent" in prompt_lower:
            return self._explain_gradient_descent(level) + rag_note

        # Backpropagation
        if "backprop" in prompt_lower or "neural network" in prompt_lower:
            return self._explain_backpropagation(level) + rag_note

        # Database Normalization
        if "normaliz" in prompt_lower or "database" in prompt_lower or "sql" in prompt_lower:
            return self._explain_normalization(level) + rag_note

        # Transformers
        if "transformer" in prompt_lower or "attention" in prompt_lower:
            return self._explain_transformers(level) + rag_note

        # Graph Algorithms
        if "dijkstra" in prompt_lower or "graph" in prompt_lower or "dynamic programming" in prompt_lower:
            return self._explain_algorithms(prompt, level) + rag_note

        # 3. Action specific fallback paths
        if action_type in ["simplify_concept", "clarify_doubt"]:
            return self._simplify_concept_response(prompt, level, weak_topics) + rag_note

        if action_type in ["notes_qa", "summarize_material"]:
            return self._notes_qa_response(prompt, level, context_passages)

        if action_type in ["recommend_resources", "recommend_learning_resources"]:
            return self._recommend_resources_response(prompt, level, weak_topics)

        if action_type in ["create_study_plan", "study_planning"] or "study plan" in prompt_lower or "schedule" in prompt_lower:
            return self._build_study_plan(prompt, level, weak_topics)

        if action_type in ["generate_quiz", "generate_practice_questions", "quiz_generation"] or "practice" in prompt_lower or "quiz" in prompt_lower:
            return self._build_practice_prompt_response(prompt, level)

        if action_type in ["revise_weak_topic", "suggest_revision_weak_topic", "revision"] or any(w.lower() in prompt_lower for w in weak_topics):
            return self._build_weak_topic_guidance(prompt, weak_topics, level) + rag_note

        # Generic intelligent academic fallback
        return self._generic_academic_explanation(prompt, level, rag_note)

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

    def _notes_qa_response(self, prompt: str, level: str, context_passages: List[Dict[str, Any]]) -> str:
        if not context_passages:
            return f"""### 📖 Course Notes Inquiry: {prompt.strip().capitalize()}

**Retrieval Status:** *No uploaded course documents directly matched this query in your Knowledge Base.*

---

#### Academic Synthesis (Curriculum Grounded):
Based on your academic degree program requirements:
* This topic is a core syllabus milestone for your semester coursework.
* Core theorems, algorithmic proofs, and boundary conditions are typically assessed on mid-term and semester examinations.

---
💡 **Next Step:** Upload your lecture slides or notes (PDF or TXT) in the **Knowledge Base** tab! Once uploaded, I will cite specific slide numbers and page references directly in my answers."""

        citations_md = "\n".join([
            f"* **[{p['filename']} — Page {p.get('page_number', 1)}]** (Relevance Score: {p.get('score', 0.0)}):\n  > \"{p['text'][:250]}...\""
            for p in context_passages[:3]
        ])

        return f"""### 📖 Course Notes Grounded Response

**Query:** {prompt.strip()}  
**Academic Level:** {level}

---

#### 📚 Excerpts from Your Course Knowledge Base:
{citations_md}

---

#### Synthesis & Exam Key Points:
The retrieved course material emphasizes that this mechanism directly affects convergence speed and stability under real-world constraints. Review the cited pages carefully for mathematical proofs and boundary conditions prior to examinations.

---
💡 *You can ask follow-up questions about these excerpts or generate a diagnostic practice quiz!*"""

    def _recommend_resources_response(self, prompt: str, level: str, weak_topics: List[str]) -> str:
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

    def _explain_backpropagation(self, level: str) -> str:
        formula = r"""$$\frac{\partial L}{\partial W^{[1]}} = \frac{\partial L}{\partial a^{[2]}} \cdot \frac{\partial a^{[2]}}{\partial z^{[2]}} \cdot \frac{\partial z^{[2]}}{\partial a^{[1]}} \cdot \frac{\partial a^{[1]}}{\partial z^{[1]}} \cdot \frac{\partial z^{[1]}}{\partial W^{[1]}}$$"""
        return f"""### 🧠 Concept Breakdown: Backpropagation in Neural Networks

**Targeted Level:** {level}  
**Core Purpose:** Backpropagation (short for *backward propagation of errors*) is the fundamental algorithm used to calculate the gradient of the loss function with respect to each weight in a multi-layer neural network using the **chain rule of calculus**.

---

#### 1. Intuition & High-Level Flow
1. **Forward Pass:** Input data flows through layers with activation functions (e.g., ReLU, Sigmoid). Predictions are made: $\\hat{{y}} = f(Wx + b)$.
2. **Loss Computation:** Measure discrepancy between prediction $\\hat{{y}}$ and ground truth $y$ using a loss function (e.g., Mean Squared Error or Cross-Entropy).
3. **Backward Pass (Chain Rule):** Compute partial derivatives layer by layer using the chain rule from output back to input.
4. **Parameter Update:** Update weights using Gradient Descent:
   $$W := W - \\alpha \\frac{{\\partial L}}{{\\partial W}}$$
   *(where $\\alpha$ is the learning rate)*.

---

#### 2. Mathematical Foundation (Chain Rule)
For a 2-layer network with activation $a^{[1]} = \\sigma(z^{[1]})$ and $z^{[1]} = W^{[1]}x + b^{[1]}$:
{formula}

---

#### 3. Common Pitfalls & Why Students Struggle
* **Vanishing / Exploding Gradients:** Deep networks with Sigmoid/Tanh suffer from vanishing gradients because $\\sigma'(z) \\le 0.25$. Solution: Use **ReLU** or Batch Normalization.
* **Incorrect Weight Initialization:** Initializing all weights to zeros causes symmetry where all neurons learn identical features. Solution: He or Xavier initialization.

---

#### 4. Quick Check Practice
* **Question:** What happens to weight updates during backpropagation if the learning rate $\\alpha$ is set excessively large?
* *Check your answer:* The updates will oscillate or diverge, preventing the loss from converging to a local minimum."""

    def _explain_gradient_descent(self, level: str) -> str:
        return f"""### 📉 Deep Dive: Gradient Descent Optimization

**Targeted Level:** {level}  
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
Where $\\eta$ represents the learning rate and $\\nabla J(\\theta)$ denotes the gradient vector."""

    def _explain_normalization(self, level: str) -> str:
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

    def _explain_transformers(self, level: str) -> str:
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

    def _explain_algorithms(self, prompt: str, level: str) -> str:
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

    def _build_practice_prompt_response(self, prompt: str, level: str) -> str:
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

    def _build_weak_topic_guidance(self, prompt: str, weak_topics: List[str], level: str) -> str:
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

    def _generic_academic_explanation(self, prompt: str, level: str, rag_note: str) -> str:
        topic_title = prompt.strip().capitalize()
        if len(topic_title) > 60:
            topic_title = topic_title[:57] + "..."
        return f"""### 📚 Academic Analysis: {topic_title}

**Academic Level:** {level}  
**Focus:** Structured explanation, operational mechanics, and key takeaways.
{rag_note}

---

#### 1. Definition & Core Concept
Understanding this topic requires recognizing its core functional role in modern computing and engineering systems. It provides the structured foundation for managing complexity, optimizing performance, and guaranteeing correctness.

#### 2. Key Mechanisms & Principles
* **Structure & Representation:** How information and states are encoded and transitioned.
* **Analytical Invariant:** Properties that remain true across all operations.
* **Trade-offs:** Latency vs. throughput, accuracy vs. computational complexity, or storage vs. speed.

#### 3. Educational Summary & Application
* Always verify boundary conditions and edge cases.
* Relate theoretical constraints directly to practical implementations.
* Consult your enrolled course syllabus to verify specific exam formatting.

---
💡 *Feel free to ask for a practice problem, code snippet, or a step-by-step numerical walkthrough!*"""

    def _explain_machine_learning(self, level: str, context_passages: List[Dict[str, Any]] = None) -> str:
        text = r"""### 🤖 What is Machine Learning? (22AI503: Unit 1)

**Academic Level:** __LEVEL__  
**Syllabus Reference:** *22AI503: Machine Learning — Unit 1: Introduction & Learning Systems (`ML U1.1(2).pdf`)*

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
* **Machine Learning Approach:** A Naive Bayes or Logistic Regression model computes conditional probabilities $P(\\text{Spam} \\mid \\text{Words})$ over millions of historical emails, continuously adjusting its weights as spam patterns evolve.

---

#### 4. Exam Key Takeaway
For university examinations, always contrast ML with traditional software:  
*Traditional:* $\\text{Data} + \\text{Program} \\longrightarrow \\text{Output}$  
*Machine Learning:* $\\text{Data} + \\text{Output (Labels)} \\longrightarrow \\text{Learned Program (Model)}$"""
        return text.replace("__LEVEL__", level)

    def _explain_ai_vs_ml(self, level: str) -> str:
        text = """### 🧠 Artificial Intelligence vs. Machine Learning: Structural Comparison

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *21CB603: Artificial Intelligence (`AI 1.1.pdf`) vs. 22AI503: Machine Learning (`ML U1.1(2).pdf`)*

---

#### 1. The Core Hierarchy & Scope
Artificial Intelligence (AI) and Machine Learning (ML) are not competing alternatives—**Machine Learning is a specialized subfield of Artificial Intelligence**:

$$\\text{Deep Learning (DL)} \\subset \\text{Machine Learning (ML)} \\subset \\text{Artificial Intelligence (AI)}$$

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

---

#### 3. Concrete Example: Autonomous Driving
* **The AI System:** The entire self-driving vehicle orchestrator. It manages route planning ($A^*$ search), traffic rule compliance (symbolic logic), actuator controls, and high-level decisions (*"Yield at intersection"*).
* **The ML Subsystems:** The computer vision modules (Convolutional Neural Networks) trained on millions of labeled road images to classify pedestrian bounding boxes and lane dividers.

---

💡 *Exam Tip:* Remember that an expert system (like a medical diagnosis rule engine with 10,000 if-then clauses) is AI, but it is **not** Machine Learning because it cannot learn or adjust its weights from new data."""
        return text.replace("__LEVEL__", level)

    def _explain_overfitting(self, level: str, context_passages: List[Dict[str, Any]] = None) -> str:
        text = """### ⚠️ Why Does Overfitting Happen? Analysis & Mitigation

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22AI503: Machine Learning — Unit 1: Challenges in ML (`ML U1.1(2).pdf`, Page 5)*

---

#### 1. What is Overfitting?
**Overfitting** occurs when a machine learning model learns the training data **too well**, including its random noise, idiosyncrasies, and outliers, rather than learning the true underlying mathematical distribution.

* **Symptom:** **Near-zero training error** ($E_{\\text{train}} \\approx 0$), but **high test/generalization error** ($E_{\\text{val}} \\gg 0$).
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

---

#### 4. Practical Engineering Solutions (Exam Checklist)
* **Regularization ($L_1$ Lasso, $L_2$ Ridge):** Add a penalty term $\\lambda \\sum w_i^2$ to the loss function to constrain weight magnitudes.
* **Cross-Validation ($k$-Fold):** Partition data into $k$ subsets to ensure consistent validation across rotations.
* **Early Stopping:** Monitor validation loss during training and halt optimization the moment validation loss starts climbing.
* **Dropout (Neural Networks):** Randomly deactivate a fraction $p$ (e.g., 20–50%) of neurons during each forward-backward pass.
* **Data Augmentation:** Artificially expand dataset diversity (rotations, scaling, noise injection)."""
        return text.replace("__LEVEL__", level)

    def _explain_tcp_udp(self, level: str, context_passages: List[Dict[str, Any]] = None) -> str:
        text = """### 🌐 TCP vs. UDP: Comprehensive Protocol Comparison & Examples

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22CS502: Computer Networks — Unit 1: Architecture & Layering (`CN 1.1.pdf`)*

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

---

#### 3. Intuitive Real-World Analogies & Applications
* **TCP = Certified Registered Postal Mail:**  
  * *Analogy:* You send legal documents where the recipient must sign a return receipt. If the letter is lost in transit, the post office notifies you and resends it until receipt is verified.  
  * *Applications:* **Web Browsing (HTTP/HTTPS)**, **File Transfer (FTP/SFTP)**, **Email (SMTP/IMAP)**, **Remote Terminal (SSH)**. Loss of a single bit could corrupt an entire file or executable.
* **UDP = Live Radio / Megaphone Broadcast:**  
  * *Analogy:* A sports commentator shouting play-by-play over the radio. If static causes you to miss 1 word from 2 seconds ago, re-announcing it 5 seconds later is useless—you only care about what is happening right now.  
  * *Applications:* **Live Video Streaming**, **Online Multiplayer Gaming**, **VoIP (Voice over IP / Zoom / Discord)**, **DNS Lookups (UDP port 53)**."""
        return text.replace("__LEVEL__", level)

    def _explain_cloud_computing(self, level: str, context_passages: List[Dict[str, Any]] = None) -> str:
        text = """### ☁️ What is Cloud Computing? NIST Standards & Architectural Models

**Academic Level:** __LEVEL__  
**Curriculum Grounding:** *22IT402: Cloud Computing — Unit 1: Principles & Service Models (`CC 1.1.pdf`)*

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
  * *Examples:* Google Workspace (Docs, Gmail), Microsoft 365, Salesforce."""
        return text.replace("__LEVEL__", level)

    def _explain_step_by_step(self, prompt: str, last_turn_text: str, level: str, context_passages: List[Dict[str, Any]]) -> str:
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

    def _provide_another_example(self, prompt: str, last_turn_text: str, level: str, context_passages: List[Dict[str, Any]]) -> str:
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

    def _make_previous_simpler(self, last_turn_text: str, level: str) -> str:
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

    def _summarize_for_exam(self, prompt: str, last_turn_text: str, level: str, context_passages: List[Dict[str, Any]]) -> str:
        citations = ""
        if context_passages:
            citations = "\n**Syllabus Sources:** " + ", ".join([f"`{p['filename']} (P.{p.get('page_number', 1)})`" for p in context_passages[:2]])

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


