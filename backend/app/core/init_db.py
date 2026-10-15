import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
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

        # Safe column migration check
        try:
            with engine.connect() as conn:
                res = conn.exec_driver_sql("PRAGMA table_info(knowledge_documents)").fetchall()
                cols = [r[1] for r in res]
                if "subject_id" not in cols:
                    conn.exec_driver_sql("ALTER TABLE knowledge_documents ADD COLUMN subject_id INTEGER")
                if "extracted_topics" not in cols:
                    conn.exec_driver_sql("ALTER TABLE knowledge_documents ADD COLUMN extracted_topics TEXT DEFAULT '[]'")
                s_res = conn.exec_driver_sql("PRAGMA table_info(subjects)").fetchall()
                s_cols = [r[1] for r in s_res]
                if "document_filename" not in s_cols:
                    conn.exec_driver_sql("ALTER TABLE subjects ADD COLUMN document_filename VARCHAR(255)")
        except Exception as e:
            print(f"[init_db] Column check: {e}")

        # The 4 Core Academic Courses
        course_definitions = [
            {
                "id": 1,
                "code": "22AI503",
                "name": "Machine Learning",
                "document_filename": "ML U1.1(2).pdf",
                "department": "AI & Data Science (AI&DS)",
                "semester": "6th Semester",
                "description": "Supervised, unsupervised, reinforcement learning, well-posed learning problems, designing learning systems.",
                "credits": 4
            },
            {
                "id": 2,
                "code": "21CB603",
                "name": "Artificial Intelligence",
                "document_filename": "AI 1.1.pdf",
                "department": "AI & Data Science (AI&DS)",
                "semester": "6th Semester",
                "description": "Foundations of AI, Turing test, rationality, agent architectures and PEAS environments.",
                "credits": 4
            },
            {
                "id": 3,
                "code": "22CS502",
                "name": "Computer Networks",
                "document_filename": "CN 1.1.pdf",
                "department": "AI & Data Science (AI&DS)",
                "semester": "6th Semester",
                "description": "Data communications, transmission media, network criteria, topologies (mesh, star, bus, ring), LAN/WAN.",
                "credits": 4
            },
            {
                "id": 4,
                "code": "22IT402",
                "name": "Cloud Computing",
                "document_filename": "CC 1.1.pdf",
                "department": "AI & Data Science (AI&DS)",
                "semester": "6th Semester",
                "description": "NIST cloud characteristics, service models (IaaS, PaaS, SaaS), deployment models (public, private, hybrid).",
                "credits": 3
            }
        ]

        for c_def in course_definitions:
            subj = db.query(Subject).filter(Subject.id == c_def["id"]).first()
            if not subj:
                subj = Subject(
                    id=c_def["id"],
                    code=c_def["code"],
                    name=c_def["name"],
                    document_filename=c_def["document_filename"],
                    department=c_def["department"],
                    semester=c_def["semester"],
                    description=c_def["description"],
                    credits=c_def["credits"]
                )
                db.add(subj)
            else:
                subj.code = c_def["code"]
                subj.name = c_def["name"]
                subj.document_filename = c_def["document_filename"]
                subj.department = c_def["department"]
                subj.semester = c_def["semester"]
                subj.description = c_def["description"]
                subj.credits = c_def["credits"]
        db.commit()

        # Update student enrolled subjects to the 4 courses
        if student:
            student.enrolled_subjects = json.dumps([c["name"] for c in course_definitions])
            db.commit()

        # Automatically index and link the 4 source PDFs to their courses
        from pathlib import Path
        from app.retrieval.engine import retrieval_engine
        root_dir = Path(__file__).resolve().parent.parent.parent.parent
        materials_dir = root_dir / "data" / "course_materials"
        if not materials_dir.exists():
            materials_dir = Path("data/course_materials").resolve()

        if materials_dir.exists():
            for c_def in course_definitions:
                filename = c_def["document_filename"]
                p = materials_dir / filename
                if not p.exists() and filename == "ML U1.1(2).pdf":
                    alt_p = materials_dir / "ML U1.1.pdf"
                    if alt_p.exists():
                        p = alt_p
                if p.exists():
                    existing_doc = db.query(KnowledgeDocument).filter(
                        (KnowledgeDocument.filename == filename) | (KnowledgeDocument.filename == p.name)
                    ).first()
                    if not existing_doc or existing_doc.num_chunks == 0:
                        try:
                            doc = retrieval_engine.process_and_store_document(
                                db=db,
                                student_id=student.id if student else 1,
                                filename=filename,
                                file_path=p,
                                file_size=p.stat().st_size,
                                file_type="pdf",
                                subject_id=c_def["id"]
                            )
                            print(f"[init_db] Indexed course PDF: {filename} -> {c_def['name']} ({doc.num_chunks} chunks)")
                        except Exception as e:
                            print(f"[init_db] Error indexing {filename}: {e}")
                    else:
                        existing_doc.subject_id = c_def["id"]
                        if not existing_doc.extracted_topics or existing_doc.extracted_topics == "[]":
                            pages = retrieval_engine.extract_text_from_pdf(p)
                            existing_doc.extracted_topics = json.dumps(
                                retrieval_engine.extract_topics_from_text(pages, filename)
                            )
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

        sync_orphaned_documents(db)

        print("[init_db] Database initialized with Argon2 credentials, project team, and study plans!")

    finally:
        db.close()

def sync_orphaned_documents(db: Session):
    """
    Ensure every uploaded or seeded document is linked to an appropriate course Subject
    and has extracted topics populated. If a document belongs to a new course (e.g. Big Data),
    safely create the Subject if it doesn't already exist. Strictly prevents duplicates.
    """
    import json
    from pathlib import Path
    from app.models.entities import KnowledgeDocument, Subject, DocumentChunk
    from app.retrieval.engine import retrieval_engine

    # Ensure Big Data Analytics subject exists if any Big Data document is present
    bd_doc = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.filename.ilike("%bd%") | KnowledgeDocument.filename.ilike("%big data%")
    ).first()
    if bd_doc:
        bd_subj = db.query(Subject).filter(
            (Subject.name.ilike("%Big Data%")) | (Subject.code.ilike("22AI602"))
        ).first()
        if not bd_subj:
            bd_subj = Subject(
                code="22AI602",
                name="Big Data Analytics",
                document_filename=bd_doc.filename,
                department="AI & Data Science (AI&DS)",
                semester="6th Semester",
                description="Big data architecture, 5 V's, Hadoop HDFS, MapReduce, Apache Spark, NoSQL data stores, and real-time streaming analytics.",
                credits=4
            )
            db.add(bd_subj)
            db.commit()
            db.refresh(bd_subj)

    # Link orphaned documents to existing or newly created subjects
    orphaned_docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.subject_id.is_(None)).all()
    for doc in orphaned_docs:
        fn_l = doc.filename.lower()
        matched_subj = None
        if "ml" in fn_l or "machine" in fn_l or "backpropagation" in fn_l or "cs601" in fn_l:
            matched_subj = db.query(Subject).filter(Subject.name.ilike("%Machine Learning%")).first()
        elif "ai" in fn_l or "artificial" in fn_l or "21cb603" in fn_l:
            matched_subj = db.query(Subject).filter(Subject.name.ilike("%Artificial Intelligence%")).first()
        elif "cn" in fn_l or "network" in fn_l or "22cs502" in fn_l:
            matched_subj = db.query(Subject).filter(Subject.name.ilike("%Computer Networks%")).first()
        elif "cc" in fn_l or "cloud" in fn_l or "22it402" in fn_l:
            matched_subj = db.query(Subject).filter(Subject.name.ilike("%Cloud Computing%")).first()
        elif "bd" in fn_l or "big data" in fn_l or "22ai602" in fn_l:
            matched_subj = db.query(Subject).filter(Subject.name.ilike("%Big Data%")).first()

        if matched_subj:
            doc.subject_id = matched_subj.id

    # Populate extracted_topics if empty or default fallback
    all_docs = db.query(KnowledgeDocument).all()
    for doc in all_docs:
        if not doc.extracted_topics or doc.extracted_topics in ["[]", '["Foundational Principles", "Architectural Overview", "Key Implementations & Concepts"]']:
            try:
                p = Path(doc.file_path)
                if not p.exists():
                    for search_dir in ["data/course_materials", "data/uploads"]:
                        alt_p = Path(search_dir) / doc.filename
                        if alt_p.exists():
                            p = alt_p
                            break
                if p.exists():
                    if doc.file_type == "pdf":
                        pages = retrieval_engine.extract_text_from_pdf(p)
                    else:
                        pages = retrieval_engine.extract_text_from_txt(p)
                    new_topics = retrieval_engine.extract_topics_from_text(pages, doc.filename)
                    if new_topics:
                        doc.extracted_topics = json.dumps(new_topics)
            except Exception as e:
                print(f"[sync_orphaned_documents] Topic extraction note for {doc.filename}: {e}")

    db.commit()

if __name__ == "__main__":
    init_db()
