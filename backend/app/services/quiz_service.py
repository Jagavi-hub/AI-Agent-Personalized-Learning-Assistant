import json
import random
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    Quiz, Question, QuizAttempt, QuizAnswer,
    LearningActivity, Recommendation, Student
)
from app.services.llm_service import llm_service

# Rich, curated academic question bank across core higher ed topics
QUESTION_REPOSITORY = {
    "backpropagation": [
        {
            "question_text": "What mathematical principle enables backpropagation to calculate gradients across multiple neural layers?",
            "option_a": "Taylor Series expansion",
            "option_b": "Chain Rule of calculus",
            "option_c": "L'Hôpital's Rule",
            "option_d": "Fourier Transform",
            "correct_option": "B",
            "explanation": "Backpropagation computes the partial derivatives of the loss with respect to weights layer-by-layer using the chain rule: dL/dw = (dL/da) * (da/dz) * (dz/dw).",
            "topic": "Backpropagation"
        },
        {
            "question_text": "Which activation function is most prone to the 'vanishing gradient' problem in deep architectures during backprop?",
            "option_a": "Rectified Linear Unit (ReLU)",
            "option_b": "Leaky ReLU",
            "option_c": "Standard Sigmoid",
            "option_d": "GeLU",
            "correct_option": "C",
            "explanation": "The derivative of the sigmoid function peaks at only 0.25 and approaches 0 as input magnitudes grow, causing gradients to diminish exponentially over deep layers.",
            "topic": "Backpropagation"
        },
        {
            "question_text": "During weight updates in gradient descent, what role does the parameter alpha (learning rate) play?",
            "option_a": "It scales the step size taken in the direction opposite to the gradient",
            "option_b": "It determines the number of layers in the neural network",
            "option_c": "It specifies the mini-batch size during backpropagation",
            "option_d": "It dynamically sets the regularizer lambda",
            "correct_option": "A",
            "explanation": "The learning rate scales the gradient vector: W = W - alpha * grad(L), controlling how far weights shift per step.",
            "topic": "Backpropagation"
        },
        {
            "question_text": "Why must weights in a multi-layer perceptron be initialized randomly rather than to all zeros?",
            "option_a": "To reduce GPU memory allocation overhead",
            "option_b": "To break symmetry so different hidden neurons learn distinct features",
            "option_c": "To ensure matrix multiplication dimensions match",
            "option_d": "To force the learning rate to decay linearly",
            "correct_option": "B",
            "explanation": "If all weights start at zero, every neuron in a hidden layer receives the same gradient and learns identical representations, preventing symmetry breaking.",
            "topic": "Backpropagation"
        },
        {
            "question_text": "In a computational graph, what is computed during the forward pass versus the backward pass?",
            "option_a": "Forward computes gradients; backward computes layer activations",
            "option_b": "Forward computes intermediate activations & loss; backward computes partial derivatives",
            "option_c": "Both passes compute weight updates concurrently",
            "option_d": "Forward trains weights; backward validates predictions",
            "correct_option": "B",
            "explanation": "The forward pass computes activations z and a culminating in the loss L. The backward pass traverses in reverse to compute dL/dz and dL/dW.",
            "topic": "Backpropagation"
        }
    ],
    "gradient descent": [
        {
            "question_text": "What is the primary computational advantage of Mini-Batch Gradient Descent over full Batch Gradient Descent?",
            "option_a": "Guarantees locating the absolute global minimum in non-convex spaces",
            "option_b": "Enables frequent weight updates and fits efficiently into GPU cache",
            "option_c": "Eliminates the requirement for a learning rate hyperparameter",
            "option_d": "Removes all gradient variance",
            "correct_option": "B",
            "explanation": "Mini-batch processes smaller subsets (e.g. 32-128 samples), allowing parallel matrix math on hardware accelerators while updating parameters frequently.",
            "topic": "Gradient Descent"
        },
        {
            "question_text": "In optimization, how does momentum assist standard Stochastic Gradient Descent?",
            "option_a": "By pruning low-weight synapses after each epoch",
            "option_b": "By damping oscillations in high-curvature dimensions and accelerating along valleys",
            "option_c": "By converting non-convex loss surfaces into convex planes",
            "option_d": "By automatically standardizing training dataset features",
            "correct_option": "B",
            "explanation": "Momentum accumulates past velocity v = beta*v + (1-beta)*grad, dampening wild perpendicular oscillations and accelerating progress down ravines.",
            "topic": "Gradient Descent"
        },
        {
            "question_text": "What symptom occurs during gradient descent if the learning rate is configured excessively high?",
            "option_a": "Underfitting due to zero weight updates",
            "option_b": "Weights oscillate wildly and the loss diverges to infinity (NaN)",
            "option_c": "Immediate convergence to zero loss",
            "option_d": "The model converts to a decision tree",
            "correct_option": "B",
            "explanation": "An oversized learning rate overshoots the minimum, stepping higher onto steeper loss walls until numerical overflow occurs.",
            "topic": "Gradient Descent"
        }
    ],
    "normalization": [
        {
            "question_text": "Which condition must be met for a relational schema to be in Second Normal Form (2NF)?",
            "option_a": "It must be in 1NF and have no transitive dependencies",
            "option_b": "It must be in 1NF and have no partial dependencies on any candidate key",
            "option_c": "Every determinant must be a candidate key",
            "option_d": "All column data types must be strings",
            "correct_option": "B",
            "explanation": "2NF requires 1NF and guarantees that all non-prime attributes are fully functionally dependent on the entire composite primary key (no partial dependencies).",
            "topic": "Database Normalization"
        },
        {
            "question_text": "If attribute X functionally determines Y, and Y determines Z (where X is the key), what anomaly is formed?",
            "option_a": "Partial dependency violating 2NF",
            "option_b": "Transitive dependency violating 3NF",
            "option_c": "Multi-valued dependency violating 4NF",
            "option_d": "Lossy join decomposition",
            "correct_option": "B",
            "explanation": "A transitive dependency occurs when non-key attribute Z depends on non-key attribute Y, which depends on primary key X. This violates 3NF.",
            "topic": "Database Normalization"
        },
        {
            "question_text": "What distinguishes Boyce-Codd Normal Form (BCNF) from 3NF?",
            "option_a": "In BCNF, every determinant in all non-trivial functional dependencies must be a super key",
            "option_b": "BCNF permits non-atomic nested table columns",
            "option_c": "3NF is strictly stronger than BCNF",
            "option_d": "BCNF requires all foreign keys to be composite integers",
            "correct_option": "A",
            "explanation": "3NF allows X -> A if A is a prime attribute even if X is not a super key. BCNF strictly eliminates this exception: X must strictly be a super key.",
            "topic": "Database Normalization"
        }
    ],
    "cnn": [
        {
            "question_text": "What key spatial property do convolutional layers exploit in visual data?",
            "option_a": "Translation invariance and local connectivity",
            "option_b": "Complete all-to-all dense matrix multiplication",
            "option_c": "Temporal recursion across sequential tokens",
            "option_d": "Strict sorting of pixel brightness",
            "correct_option": "A",
            "explanation": "CNNs leverage parameter sharing and local receptive fields to detect patterns regardless of spatial position (translation equivariance/invariance).",
            "topic": "Convolutional Neural Networks"
        },
        {
            "question_text": "What is the primary function of Max Pooling layers in deep CNN architectures?",
            "option_a": "To introduce non-linear activation functions",
            "option_b": "To reduce spatial dimensions (height and width), decreasing parameters and computation",
            "option_c": "To backpropagate learning rates to input images",
            "option_d": "To equalize contrast histogram distribution",
            "correct_option": "B",
            "explanation": "Max pooling downsamples feature maps, providing scale tolerance and drastically lowering memory and parameter footprint.",
            "topic": "Convolutional Neural Networks"
        }
    ],
    "transformers": [
        {
            "question_text": "In the Transformer architecture, why are Positional Encodings added to input token embeddings?",
            "option_a": "To compute softmax probabilities for next token prediction",
            "option_b": "Because self-attention operations are inherently permutation invariant and lack inherent sequence order",
            "option_c": "To normalize embeddings to zero mean and unit variance",
            "option_d": "To encrypt input data against adversarial attacks",
            "correct_option": "B",
            "explanation": "Self-attention computes dot products across pairs without notion of word order. Positional encodings inject sequential positioning into the representations.",
            "topic": "Transformers"
        },
        {
            "question_text": "What is the computational complexity of standard Scaled Dot-Product Attention with respect to sequence length N?",
            "option_a": "O(N)",
            "option_b": "O(N * log N)",
            "option_c": "O(N^2)",
            "option_d": "O(2^N)",
            "correct_option": "C",
            "explanation": "Every token computes an attention score with every other token, resulting in an N x N matrix calculation with quadratic complexity O(N^2).",
            "topic": "Transformers"
        }
    ],
    "algorithms": [
        {
            "question_text": "What is the time complexity of Dijkstra's algorithm implemented with a Min-Binary Heap?",
            "option_a": "O(V^3)",
            "option_b": "O((V + E) * log V)",
            "option_c": "O(V * E)",
            "option_d": "O(log(V + E))",
            "correct_option": "B",
            "explanation": "With a min-heap, extracting min takes O(log V) across V vertices, and relaxation updates edge keys in O(log V) across E edges, giving O((V + E) log V).",
            "topic": "Graph Algorithms"
        },
        {
            "question_text": "Why does Dijkstra's algorithm fail on graphs containing negative edge weights?",
            "option_a": "Because it uses a queue instead of a stack",
            "option_b": "Because once a vertex is marked visited, it assumes its shortest path is final and will not re-evaluate it",
            "option_c": "Because negative numbers cannot be represented in a binary tree",
            "option_d": "Because it only functions on Directed Acyclic Graphs (DAGs)",
            "correct_option": "B",
            "explanation": "Dijkstra's greedy choice assumes adding edges can only increase path distance. A negative weight can decrease distance to an already 'finalized' vertex.",
            "topic": "Graph Algorithms"
        }
    ]
}

class QuizService:
    """Handles quiz generation, scoring, analytics updating, and remediation."""

    def generate_quiz(
        self,
        db: Session,
        student_id: int,
        topic: str,
        difficulty: str = "Intermediate",
        num_questions: int = 5,
        subject_id: Optional[int] = None
    ) -> Quiz:
        """Create a new quiz record with questions."""
        # 1. Create Quiz entity
        quiz = Quiz(
            student_id=student_id,
            topic=topic,
            subject_id=subject_id,
            difficulty=difficulty,
            num_questions=num_questions
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)

        # 2. Select or generate questions
        topic_lower = topic.lower()
        matched_pool = []
        for key, questions in QUESTION_REPOSITORY.items():
            if key in topic_lower:
                matched_pool.extend(questions)

        if not matched_pool:
            # Check broad match or take diverse pool
            all_q = []
            for q_list in QUESTION_REPOSITORY.values():
                all_q.extend(q_list)
            matched_pool = all_q

        # Sample required number of questions
        selected_raw = random.sample(matched_pool, min(num_questions, len(matched_pool)))
        
        # If pool has fewer than requested, create synthesized variations
        while len(selected_raw) < num_questions:
            idx = len(selected_raw) + 1
            selected_raw.append({
                "question_text": f"In {topic}, which of the following best characterizes primary principle #{idx}?",
                "option_a": f"Optimizing trade-offs between computational complexity and accuracy in {topic}",
                "option_b": "Bypassing foundational constraints to enforce immediate convergence",
                "option_c": "Static linear approximations without validation checks",
                "option_d": "Eliminating invariant boundary assertions",
                "correct_option": "A",
                "explanation": f"Core theory in {topic} centers on balancing system throughput, model accuracy, and resource limits under analytical invariants.",
                "topic": topic
            })

        # Save questions to DB
        question_entities = []
        for q_data in selected_raw:
            q_ent = Question(
                quiz_id=quiz.id,
                question_text=q_data["question_text"],
                option_a=q_data["option_a"],
                option_b=q_data["option_b"],
                option_c=q_data["option_c"],
                option_d=q_data["option_d"],
                correct_option=q_data["correct_option"],
                explanation=q_data["explanation"],
                topic=q_data.get("topic", topic)
            )
            question_entities.append(q_ent)

        db.bulk_save_objects(question_entities)
        db.commit()
        db.refresh(quiz)
        return quiz

    def submit_and_score_quiz(
        self,
        db: Session,
        student_id: int,
        quiz_id: int,
        submitted_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evaluate answers strictly against DB answer keys.
        Record attempt, calculate performance, identify weak areas,
        and generate proactive recommendations.
        """
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.student_id == student_id).first()
        if not quiz:
            raise ValueError("Quiz not found or unauthorized.")

        # Load questions
        questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
        q_map = {q.id: q for q in questions}

        total = len(questions)
        correct_count = 0
        detailed_results = []
        answers_to_save = []
        topic_scores = {} # topic -> {correct: int, total: int}

        # Index submitted answers by question_id
        user_choice_map = {ans["question_id"]: ans["selected_option"].strip().upper() for ans in submitted_answers}

        for q in questions:
            user_choice = user_choice_map.get(q.id, "")
            is_correct = (user_choice == q.correct_option)
            if is_correct:
                correct_count += 1

            topic_key = q.topic or quiz.topic
            if topic_key not in topic_scores:
                topic_scores[topic_key] = {"correct": 0, "total": 0}
            topic_scores[topic_key]["total"] += 1
            if is_correct:
                topic_scores[topic_key]["correct"] += 1

            detailed_results.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "selected_option": user_choice,
                "correct_option": q.correct_option,
                "is_correct": is_correct,
                "explanation": q.explanation,
                "topic": topic_key
            })

        percentage = round((correct_count / total * 100) if total > 0 else 0.0, 1)

        # Create QuizAttempt
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            student_id=student_id,
            score=correct_count,
            total_questions=total,
            percentage=percentage,
            completed_at=datetime.utcnow()
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        # Save QuizAnswer records
        for res in detailed_results:
            ans_record = QuizAnswer(
                attempt_id=attempt.id,
                question_id=res["question_id"],
                selected_option=res["selected_option"],
                is_correct=res["is_correct"]
            )
            answers_to_save.append(ans_record)
        db.bulk_save_objects(answers_to_save)

        # Identify weak and strong topics from this attempt
        weak_topics = []
        strong_topics = []
        for t_name, stats in topic_scores.items():
            pct = (stats["correct"] / stats["total"]) * 100
            if pct < 60:
                weak_topics.append(t_name)
            elif pct >= 80:
                strong_topics.append(t_name)

        # 4. Generate persistent recommendations if weak topics found
        recommendations_added = 0
        for weak in weak_topics:
            # Check if active recommendation already exists
            existing_rec = db.query(Recommendation).filter(
                Recommendation.student_id == student_id,
                Recommendation.topic == weak,
                Recommendation.is_completed == False
            ).first()

            if not existing_rec:
                new_rec = Recommendation(
                    student_id=student_id,
                    topic=weak,
                    title=f"Review & Reinforce: {weak}",
                    reason=f"Scored {percentage}% on recent quiz. Conceptual gaps detected.",
                    suggested_action=f"Launch AI tutor explanation for {weak} and complete 3 practice exercises.",
                    priority="High"
                )
                db.add(new_rec)
                recommendations_added += 1

        # 5. Record activity
        activity = LearningActivity(
            student_id=student_id,
            activity_type="quiz_completed",
            title=f"Completed Quiz: {quiz.topic}",
            description=f"Scored {correct_count}/{total} ({percentage}%). {len(weak_topics)} weak area(s) flagged for revision.",
            timestamp=datetime.utcnow(),
            metadata_json=json.dumps({
                "quiz_id": quiz.id,
                "attempt_id": attempt.id,
                "score": correct_count,
                "total": total,
                "percentage": percentage,
                "weak_topics": weak_topics
            })
        )
        db.add(activity)
        db.commit()

        return {
            "attempt_id": attempt.id,
            "quiz_id": quiz.id,
            "score": correct_count,
            "total_questions": total,
            "percentage": percentage,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "results": detailed_results,
            "recommendations_generated": recommendations_added
        }

quiz_service = QuizService()
