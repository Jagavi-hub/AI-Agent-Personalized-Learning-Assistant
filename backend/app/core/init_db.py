import json
from datetime import datetime, timedelta, timezone
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.entities import (
    Student, Subject, LearningGoal, LearningActivity,
    Quiz, Question, QuizAttempt, QuizAnswer,
    KnowledgeDocument, DocumentChunk, Recommendation,
    StudyPlan, StudyTask, Feedback
)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if student already exists
        student = db.query(Student).filter(Student.id == 1).first()
        default_pwd_hash = hash_password("LearnAI2026Secure")

        if not student:
            print("[init_db] Seeding initial student profile & project team...")
            # Primary Account: Jagavi R
            student = Student(
                id=1,
                name="Jagavi R",
                email="jagavi.raju@university.edu",
                hashed_password=default_pwd_hash,
                auth_provider="local",
                is_onboarded=True,
                department="AI & Data Science (AI&DS)",
                year="3rd Year",
                semester="6th Semester",
                enrolled_subjects=json.dumps([
                    "Deep Learning & Neural Networks",
                    "Database Management Systems",
                    "Design & Analysis of Algorithms",
                    "Operating Systems Principles"
                ]),
                learning_goals=json.dumps([
                    "Master Backpropagation and Gradient Descent",
                    "Achieve 85%+ in Neural Networks Quiz",
                    "Complete DBMS Normalization Exercises"
                ]),
                preferred_learning_style="Visual & Practical",
                areas_of_interest=json.dumps([
                    "Generative AI",
                    "Deep Learning",
                    "AI Agents"
                ]),
                current_skill_level="Intermediate"
            )
            db.add(student)
            db.commit()
            db.refresh(student)

            # Team Account 2: Hemalatha A
            hema = Student(
                id=2,
                name="Hemalatha A",
                email="hemalatha.a@university.edu",
                hashed_password=default_pwd_hash,
                auth_provider="local",
                is_onboarded=True,
                department="AI & Data Science (AI&DS)",
                year="3rd Year",
                semester="6th Semester",
                enrolled_subjects=json.dumps([
                    "Deep Learning & Neural Networks",
                    "Database Management Systems"
                ]),
                learning_goals=json.dumps([
                    "Master Transformer Architectures",
                    "Study Distributed Database Systems"
                ]),
                preferred_learning_style="Theoretical & Mathematical",
                areas_of_interest=json.dumps(["Machine Learning", "Autonomous Agents"]),
                current_skill_level="Advanced"
            )
            # Team Account 3: Diya S
            diya = Student(
                id=3,
                name="Diya S",
                email="diya.s@university.edu",
                hashed_password=default_pwd_hash,
                auth_provider="local",
                is_onboarded=True,
                department="AI & Data Science (AI&DS)",
                year="3rd Year",
                semester="6th Semester",
                enrolled_subjects=json.dumps([
                    "Deep Learning & Neural Networks",
                    "Design & Analysis of Algorithms"
                ]),
                learning_goals=json.dumps([
                    "Implement Graph Algorithms with Min-Heap",
                    "Understand Backpropagation Derivations"
                ]),
                preferred_learning_style="Interactive & Problem-First",
                areas_of_interest=json.dumps(["Deep Learning", "Data Engineering"]),
                current_skill_level="Intermediate"
            )
            db.add_all([hema, diya])
            db.commit()
        else:
            # Update password hash if not set
            if not student.hashed_password:
                student.hashed_password = default_pwd_hash
                student.is_onboarded = True
                db.commit()

        # Subjects
        if db.query(Subject).count() == 0:
            print("[init_db] Seeding initial academic subjects...")
            subjects = [
                Subject(code="CS601", name="Deep Learning & Neural Networks", department="AI & Data Science (AI&DS)", semester="6th Semester", description="Foundations of deep architectures, backprop, CNNs, transformers.", credits=4),
                Subject(code="CS602", name="Database Management Systems", department="AI & Data Science (AI&DS)", semester="6th Semester", description="Relational algebra, normalization (1NF-BCNF), transactions, and indexing.", credits=4),
                Subject(code="CS603", name="Design & Analysis of Algorithms", department="AI & Data Science (AI&DS)", semester="6th Semester", description="Divide and conquer, greedy methods, dynamic programming, and graph algorithms.", credits=4),
                Subject(code="CS604", name="Operating Systems Principles", department="AI & Data Science (AI&DS)", semester="6th Semester", description="Processes, threads, CPU scheduling, synchronization, and virtual memory.", credits=3)
            ]
            db.bulk_save_objects(subjects)
            db.commit()

        # Learning Goals for Student 1
        if db.query(LearningGoal).filter(LearningGoal.student_id == 1).count() == 0:
            goals = [
                LearningGoal(student_id=1, title="Master Chain Rule & Gradient Flow in Deep Networks", category="Core Concept", target_date="Oct 20, 2026", progress=40, is_completed=False),
                LearningGoal(student_id=1, title="Master 3NF and BCNF Functional Dependencies", category="Database Systems", target_date="Oct 25, 2026", progress=80, is_completed=False),
                LearningGoal(student_id=1, title="Implement Dijkstra's Algorithm with Min-Heap", category="Algorithms", target_date="Oct 10, 2026", progress=100, is_completed=True)
            ]
            db.bulk_save_objects(goals)
            db.commit()

        # Initial Diagnostic Quiz to demonstrate Backprop weak area for Student 1
        if db.query(Quiz).filter(Quiz.student_id == 1).count() == 0:
            print("[init_db] Seeding diagnostic quiz & performance history...")
            quiz1 = Quiz(
                student_id=1,
                topic="Backpropagation & Neural Networks",
                difficulty="Intermediate",
                num_questions=5,
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(quiz1)
            db.commit()
            db.refresh(quiz1)

            q1 = Question(quiz_id=quiz1.id, question_text="What mathematical principle enables backpropagation to calculate gradients across layers?", option_a="Taylor Series", option_b="Chain Rule of calculus", option_c="L'Hôpital's Rule", option_d="Fourier Transform", correct_option="B", explanation="Backprop uses the chain rule to propagate error derivatives backwards.", topic="Backpropagation")
            q2 = Question(quiz_id=quiz1.id, question_text="Which activation function is most prone to vanishing gradients in deep architectures?", option_a="ReLU", option_b="Leaky ReLU", option_c="Standard Sigmoid", option_d="GeLU", correct_option="C", explanation="Sigmoid derivative peaks at 0.25, leading to exponential vanishing of gradients.", topic="Backpropagation")
            q3 = Question(quiz_id=quiz1.id, question_text="Why must weights in an MLP be initialized randomly rather than to all zeros?", option_a="To save memory", option_b="To break symmetry so neurons learn distinct features", option_c="To match matrix shapes", option_d="To enforce decay", correct_option="B", explanation="Zero initialization causes all neurons in a layer to compute identical gradients.", topic="Backpropagation")
            q4 = Question(quiz_id=quiz1.id, question_text="In backprop, what does alpha (learning rate) control during weight update W := W - alpha * dL/dW?", option_a="Step size in direction opposite to gradient", option_b="Number of hidden layers", option_c="Batch size", option_d="L2 penalty", correct_option="A", explanation="Alpha scales the step magnitude along the negative gradient vector.", topic="Backpropagation")
            q5 = Question(quiz_id=quiz1.id, question_text="What is computed in the forward pass versus backward pass of backpropagation?", option_a="Gradients in forward, activations in backward", option_b="Intermediate activations in forward, gradients in backward", option_c="Both compute weight updates", option_d="Forward trains, backward tests", correct_option="B", explanation="Forward pass computes activations and loss; backward computes partial derivatives.", topic="Backpropagation")
            
            db.add_all([q1, q2, q3, q4, q5])
            db.commit()

            # Attempt with 2/5 (40%) to establish genuine weak topic
            attempt1 = QuizAttempt(
                quiz_id=quiz1.id,
                student_id=1,
                score=2,
                total_questions=5,
                percentage=40.0,
                completed_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(attempt1)
            db.commit()
            db.refresh(attempt1)

            ans1 = QuizAnswer(attempt_id=attempt1.id, question_id=q1.id, selected_option="B", is_correct=True)
            ans2 = QuizAnswer(attempt_id=attempt1.id, question_id=q2.id, selected_option="A", is_correct=False)
            ans3 = QuizAnswer(attempt_id=attempt1.id, question_id=q3.id, selected_option="A", is_correct=False)
            ans4 = QuizAnswer(attempt_id=attempt1.id, question_id=q4.id, selected_option="A", is_correct=True)
            ans5 = QuizAnswer(attempt_id=attempt1.id, question_id=q5.id, selected_option="A", is_correct=False)
            db.add_all([ans1, ans2, ans3, ans4, ans5])
            db.commit()

            # Recommendation for weak topic
            rec = Recommendation(
                student_id=1,
                topic="Backpropagation",
                title="Remediate Weak Area: Backpropagation",
                reason="Identified as a weak topic (score: 40%) in recent Neural Networks quiz. Conceptual gaps in gradient propagation.",
                suggested_action="Use LearnAI Assistant for an intuitive walkthrough and take a 5-question practice quiz.",
                priority="High",
                is_completed=False
            )
            rec2 = Recommendation(
                student_id=1,
                topic="Database Normalization",
                title="Practice BCNF Decomposition",
                reason="Enrolled in DBMS CS602. High exam yield topic.",
                suggested_action="Review 3NF vs BCNF rules and practice dependency preservation.",
                priority="Medium",
                is_completed=False
            )
            db.add_all([rec, rec2])

            act = LearningActivity(
                student_id=1,
                activity_type="quiz_completed",
                title="Completed Diagnostic Quiz: Backpropagation & Neural Networks",
                description="Scored 2/5 (40%). Backpropagation flagged as an active weak topic for revision.",
                timestamp=datetime.utcnow() - timedelta(days=2),
                metadata_json=json.dumps({"quiz_id": quiz1.id, "score": 2, "percentage": 40.0})
            )
            db.add(act)
            db.commit()

        # Seed initial StudyPlan and StudyTasks for Student 1
        if db.query(StudyPlan).filter(StudyPlan.student_id == 1).count() == 0:
            print("[init_db] Seeding initial study plan & tasks...")
            plan = StudyPlan(
                student_id=1,
                title="Midterm Mastery Sprint: Deep Learning & DBMS",
                subject="Deep Learning & Neural Networks",
                target_date="Oct 26, 2026",
                available_hours_per_week=14,
                is_active=True
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)

            t1 = StudyTask(plan_id=plan.id, student_id=1, topic="Backpropagation", task_description="Review Chain Rule derivations and forward/backward computational graph passes.", day_of_week="Day 1 (Mon)", estimated_minutes=60, priority="High", is_completed=True, completed_at=datetime.utcnow() - timedelta(days=1))
            t2 = StudyTask(plan_id=plan.id, student_id=1, topic="Backpropagation", task_description="Trace numerical weight updates with learning rate alpha = 0.01.", day_of_week="Day 2 (Tue)", estimated_minutes=45, priority="High", is_completed=False)
            t3 = StudyTask(plan_id=plan.id, student_id=1, topic="Gradient Descent", task_description="Contrast Batch vs Mini-batch vs Stochastic gradient descent algorithms.", day_of_week="Day 3 (Wed)", estimated_minutes=45, priority="Medium", is_completed=False)
            t4 = StudyTask(plan_id=plan.id, student_id=1, topic="Database Normalization", task_description="Solve 3 candidate key dependency decomposition exercises from CS602.", day_of_week="Day 4 (Thu)", estimated_minutes=50, priority="High", is_completed=False)
            t5 = StudyTask(plan_id=plan.id, student_id=1, topic="Comprehensive Practice", task_description="Take a 5-question timed practice quiz on LearnAI to benchmark retention.", day_of_week="Day 5 (Fri)", estimated_minutes=40, priority="High", is_completed=False)
            db.add_all([t1, t2, t3, t4, t5])
            db.commit()

        # Seed Knowledge Base default lecture document
        if db.query(KnowledgeDocument).filter(KnowledgeDocument.student_id == 1).count() == 0:
            print("[init_db] Seeding initial academic lecture notes in Knowledge Base...")
            doc = KnowledgeDocument(
                student_id=1,
                filename="CS601_Lecture4_Backpropagation_Notes.txt",
                file_path="data/uploads/CS601_Lecture4_Backpropagation_Notes.txt",
                file_size=2048,
                file_type="txt",
                num_chunks=3,
                status="processed",
                upload_date=datetime.utcnow() - timedelta(days=3)
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            c1 = DocumentChunk(
                document_id=doc.id,
                chunk_index=0,
                page_number=1,
                text="Lecture 4: Backpropagation Algorithm Foundations. In multi-layer neural networks, backpropagation computes the gradient of the objective loss function with respect to weights using the chain rule of differential calculus. The computation decomposes into a forward pass to evaluate activations and loss, followed by a reverse topological traversal to evaluate layer gradients."
            )
            c2 = DocumentChunk(
                document_id=doc.id,
                chunk_index=1,
                page_number=2,
                text="Gradient Flow and Activation Saturation: When saturated activation functions like Sigmoid or Tanh are utilized, their local derivatives vanish for inputs with high absolute values (|z| > 4). This causes the vanishing gradient problem, where earlier layers receive near-zero updates and cease training. Modern architectures mitigate this using Rectified Linear Units (ReLU) and Batch Normalization."
            )
            c3 = DocumentChunk(
                document_id=doc.id,
                chunk_index=2,
                page_number=3,
                text="Optimization and Weight Updates: Weights are updated via Gradient Descent: W = W - alpha * dL/dW, where alpha denotes the learning rate. Momentum and Adam optimizers maintain moving averages of gradients to accelerate traversal across ravines and dampen high-frequency perpendicular oscillations."
            )
            db.add_all([c1, c2, c3])
            db.commit()

        print("[init_db] Database initialized with Argon2 credentials, project team, and study plans!")

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
