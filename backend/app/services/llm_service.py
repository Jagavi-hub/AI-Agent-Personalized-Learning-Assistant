import os
import re
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

    def generate_response(
        self,
        prompt: str,
        student_profile: Dict[str, Any],
        action_type: str,
        context_passages: List[Dict[str, Any]] = None,
        performance_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate academic response. Tries Gemini API if configured; otherwise uses deterministic fallback.
        """
        context_passages = context_passages or []
        performance_context = performance_context or {}

        # 1. Try Gemini if configured
        if self.gemini_available:
            try:
                gemini_text = self._call_gemini(
                    prompt, student_profile, action_type, context_passages, performance_context
                )
                if gemini_text:
                    return {
                        "text": gemini_text,
                        "provider": "Gemini 1.5 Flash (Live API)",
                        "is_fallback": False
                    }
            except Exception as err:
                print(f"[AcademicLLMService] Gemini call failed, falling back: {err}")

        # 2. Deterministic Academic Engine Fallback
        fallback_text = self._generate_academic_fallback(
            prompt, student_profile, action_type, context_passages, performance_context
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
        performance_context: Dict[str, Any]
    ) -> str:
        student_name = student_profile.get("name", "Student")
        dept = student_profile.get("department", "Computer Science")
        level = student_profile.get("current_skill_level", "Intermediate")
        style = student_profile.get("preferred_learning_style", "Visual & Practical")
        weak_topics = performance_context.get("weak_topics", [])

        # Build prompt with RAG context
        system_instruction = (
            f"You are LearnAI, an expert AI Academic Tutor for higher education students.\n"
            f"Student Profile:\n"
            f"- Name: {student_name}\n"
            f"- Department: {dept}, Skill Level: {level}\n"
            f"- Preferred Style: {style}\n"
            f"- Identified Weak Areas: {', '.join(weak_topics) if weak_topics else 'None recorded yet'}\n"
            f"Instruction:\n"
            f"Tailor your response to this student. Action category: {action_type}.\n"
            f"Provide well-structured Markdown with clear headings, concise explanations, examples, and practice tips."
        )

        rag_context = ""
        if context_passages:
            rag_context = "\n\nRetrieved Relevant Academic Documents:\n"
            for i, p in enumerate(context_passages):
                rag_context += f"--- Source [{p['filename']}, Page {p['page_number']}] ---\n{p['text']}\n"
            rag_context += "\nCite these sources when referring to them in your answer.\n"

        full_prompt = f"{system_instruction}\n{rag_context}\nStudent Request:\n{prompt}"

        model = self.genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(full_prompt)
        return response.text

    def _generate_academic_fallback(
        self,
        prompt: str,
        student_profile: Dict[str, Any],
        action_type: str,
        context_passages: List[Dict[str, Any]],
        performance_context: Dict[str, Any]
    ) -> str:
        prompt_lower = prompt.lower()
        level = student_profile.get("current_skill_level", "Intermediate")
        weak_topics = performance_context.get("weak_topics", [])
        student_name = student_profile.get("name", "Student")

        # Include RAG context notes if available
        rag_note = ""
        if context_passages:
            rag_note = "\n\n> 📚 **Retrieved from Course Knowledge Base:**\n"
            for p in context_passages[:2]:
                rag_note += f"> *[{p['filename']} — Page {p['page_number']}]:* \"{p['text'][:220]}...\"\n"

        # Action specific fallback paths:
        if action_type == "create_study_plan" or "study plan" in prompt_lower or "schedule" in prompt_lower:
            return self._build_study_plan(prompt, level, weak_topics)

        if action_type == "generate_practice_questions" or "practice" in prompt_lower or "quiz" in prompt_lower:
            return self._build_practice_prompt_response(prompt, level)

        if action_type == "suggest_revision_weak_topic" or any(w.lower() in prompt_lower for w in weak_topics):
            return self._build_weak_topic_guidance(prompt, weak_topics, level) + rag_note

        if "backprop" in prompt_lower or "neural network" in prompt_lower:
            return self._explain_backpropagation(level) + rag_note

        if "gradient descent" in prompt_lower:
            return self._explain_gradient_descent(level) + rag_note

        if "normaliz" in prompt_lower or "database" in prompt_lower or "sql" in prompt_lower:
            return self._explain_normalization(level) + rag_note

        if "transformer" in prompt_lower or "attention" in prompt_lower:
            return self._explain_transformers(level) + rag_note

        if "dijkstra" in prompt_lower or "graph" in prompt_lower or "dynamic programming" in prompt_lower:
            return self._explain_algorithms(prompt, level) + rag_note

        # Generic intelligent academic fallback
        return self._generic_academic_explanation(prompt, level, rag_note)

    def _explain_backpropagation(self, level: str) -> str:
        return f"""### 🧠 Concept Breakdown: Backpropagation in Neural Networks

**Targeted Level:** {level}  
**Core Purpose:** Backpropagation (short for *backward propagation of errors*) is the fundamental algorithm used to calculate the gradient of the loss function with respect to each weight in a multi-layer neural network using the **chain rule of calculus**.

---

#### 1. Intuition & High-Level Flow
1. **Forward Pass:** Input data flows through layers with activation functions (e.g., ReLU, Sigmoid). Predictions are made: $\\hat{{y}} = f(Wx + b)$.
2. **Loss Computation:** Measure discrepancy between prediction $\\hat{{y}}$ and ground truth $y$ using a loss function (e.g., Mean Squared Error or Cross-Entropy).
3. **Backward Pass (Chain Rule):** Compute partial derivatives $\\frac{{\\partial L}}{{\\partial W^{[l]}}}$ from output back to input layer.
4. **Parameter Update:** Update weights using Gradient Descent:
   $$W := W - \\alpha \\frac{{\\partial L}}{{\\partial W}}$$
   *(where $\\alpha$ is the learning rate)*.

---

#### 2. Mathematical Foundation (Chain Rule)
For a 2-layer network with activation $a^{[1]} = \\sigma(z^{[1]})$ and $z^{[1]} = W^{[1]}x + b^{[1]}$:
$$\\frac{{\\partial L}}{{\\partial W^{[1]}}} = \\frac{{\\partial L}}{{\\partial a^{[2]}}} \\cdot \\frac{{\\partial a^{[2]}}}{{\\partial z^{[2]}}} \\cdot \\frac{{\\partial z^{[2]}}}{{\\partial a^{[1]}}} \\cdot \\frac{{\\partial a^{[1]}}}{{\\partial z^{[1]}}} \\cdot \\frac{{\\partial z^{[1]}}}{{\\partial W^{[1]}}}$$

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

llm_service = AcademicLLMService()
