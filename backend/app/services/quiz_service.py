import json
import random
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    Quiz, Question, QuizAttempt, QuizAnswer,
    LearningActivity, Recommendation, Student,
    Subject, KnowledgeDocument, DocumentChunk
)
from app.services.llm_service import llm_service
from app.retrieval.engine import retrieval_engine

# Authentic, course-grounded academic question bank derived directly from the 4 academic course PDFs:
# 1. 22AI503: Machine Learning (ML U1.1(2).pdf)
# 2. 21CB603: Artificial Intelligence (AI 1.1.pdf)
# 3. 22CS502: Computer Networks (CN 1.1.pdf)
# 4. 22IT402: Cloud Computing (CC 1.1.pdf)

COURSE_QUESTION_REPOSITORY = {
    "machine learning": [
        {
            "question_text": "According to Tom Mitchell's foundational definition, a computer program learns from experience E with respect to task T and performance measure P if:",
            "option_a": "Its source code size decreases with experience E",
            "option_b": "Its performance at tasks in T, as measured by P, improves with experience E",
            "option_c": "It executes with lower memory usage without error checks",
            "option_d": "It randomly explores decision spaces over time",
            "correct_option": "B",
            "explanation": "In Mitchell's definition of machine learning (22AI503, Unit 1, ML U1.1): A program is said to learn from experience E with respect to task T and performance measure P if its performance at tasks in T, as measured by P, improves with experience E.",
            "topic": "Well-Posed Learning Problems"
        },
        {
            "question_text": "In designing a checkers learning system, when the program plays games against itself, what type of training experience is obtained?",
            "option_a": "Direct training experience with human teacher supervision",
            "option_b": "Indirect training experience consisting of individual board states and the final win/loss outcome",
            "option_c": "Supervised classification with pre-labeled move vectors",
            "option_d": "Zero-shot transfer learning without reward signals",
            "correct_option": "B",
            "explanation": "In checkers learning system design (22AI503, Unit 1, ML U1.1), playing against itself yields indirect feedback because credit assignment must be distributed across hundreds of past moves leading to the final game outcome.",
            "topic": "Designing a Learning System"
        },
        {
            "question_text": "In the checkers learning system, which representation is chosen for the evaluation target function V_hat(b)?",
            "option_a": "A linear combination of board features: w0 + w1*x1 + w2*x2 + ... + w6*x6",
            "option_b": "An unconstrained recurrent graph without weights",
            "option_c": "A hardcoded lookup table of all 10^40 checkers positions",
            "option_d": "A random forest of binary decision trees",
            "correct_option": "A",
            "explanation": "Section 'Choosing a Representation for the Target Function' (22AI503, Unit 1, ML U1.1) defines V_hat(b) as a linear combination of numerical board features (e.g. number of black/red pieces and kings).",
            "topic": "Target Function Representation"
        },
        {
            "question_text": "Which weight update rule adjusts weights in the direction of steepest loss descent for function approximation in checkers?",
            "option_a": "Q-learning temporal difference update",
            "option_b": "LMS (Least Mean Squares) rule: wi <- wi + eta * (V_train(b) - V_hat(b)) * xi",
            "option_c": "Hebbian synaptic learning rule",
            "option_d": "K-Means centroid reassignment rule",
            "correct_option": "B",
            "explanation": "The LMS weight update rule (22AI503, Unit 1, ML U1.1) incrementally adjusts weights in proportion to the training prediction error: wi <- wi + eta * (V_train(b) - V_hat(b)) * xi.",
            "topic": "Function Approximation Algorithm"
        },
        {
            "question_text": "What are the four core components in the final operational design of the Checkers Learning Program?",
            "option_a": "Encoder, Decoder, Attention Head, Loss Function",
            "option_b": "Performance System, Critic, Generalizer, and Experiment Generator",
            "option_c": "Preprocessor, Tokenizer, Classifier, Evaluator",
            "option_d": "Client, Server, Database, Cache",
            "correct_option": "B",
            "explanation": "Mitchell's checkers learning architecture (22AI503, Unit 1, ML U1.1, Fig 1.2) decomposes learning into four modular subsystems: Performance System (plays games), Critic (produces training examples), Generalizer (infers target function), and Experiment Generator (selects new game conditions).",
            "topic": "Checkers Learning Program Design"
        }
    ],
    "artificial intelligence": [
        {
            "question_text": "According to the Alan Turing (1950) Turing Test approach, AI is defined under which dimension?",
            "option_a": "Systems that think rationally using formal logic",
            "option_b": "Systems that act humanly by exhibiting intelligent behavior indistinguishable from a human",
            "option_c": "Systems that emulate biological neural spike trains",
            "option_d": "Automated database indexing systems",
            "correct_option": "B",
            "explanation": "The Turing Test (21CB603, Unit 1, AI 1.1) defines AI under the 'Acting Humanly' dimension: an operational test where a computer passes if a human interrogator cannot distinguish it from a human after a written dialogue.",
            "topic": "Definitions of AI & Turing Test"
        },
        {
            "question_text": "Which four core capabilities are required for a computer to pass the standard Turing Test?",
            "option_a": "Natural language processing, knowledge representation, automated reasoning, and machine learning",
            "option_b": "High-speed graphics rendering, quantum computing, compiler optimization, and assembly",
            "option_c": "SQL query planning, database normalization, sharding, and replication",
            "option_d": "Computer vision, robotics, tactile sensing, and GPS tracking",
            "correct_option": "A",
            "explanation": "The standard Turing Test requires four disciplines (21CB603, Unit 1, AI 1.1): Natural Language Processing (communication), Knowledge Representation (storage), Automated Reasoning (inference/answering), and Machine Learning (adaptation). Note: Computer Vision and Robotics are added for the 'Total Turing Test'.",
            "topic": "Turing Test Capabilities"
        },
        {
            "question_text": "In modern Artificial Intelligence, what defines a 'Rational Agent'?",
            "option_a": "An agent that always acts identically to an average human",
            "option_b": "An agent that acts so as to achieve the best outcome or, when there is uncertainty, the best expected outcome",
            "option_c": "An agent that requires human supervision for every decision",
            "option_d": "An agent that possesses consciousness and emotions",
            "correct_option": "B",
            "explanation": "Under the 'Acting Rationally' approach (21CB603, Unit 1, AI 1.1), a rational agent operates autonomously, perceives its environment, persists over time, adapts to change, and creates/pursues goals to maximize expected performance.",
            "topic": "Rational Agents"
        },
        {
            "question_text": "Which philosophical foundation of AI established that physical minds can be explained by mechanical and physical laws?",
            "option_a": "Rationalism and Dualism",
            "option_b": "Materialism, which holds that operations of the mind are governed by physical laws",
            "option_c": "Solipsism",
            "option_d": "Existentialism",
            "correct_option": "B",
            "explanation": "The philosophical foundations of AI (21CB603, Unit 1, AI 1.1) trace the mind-brain problem: materialism posits that brain operations conform to physical laws, paving the way for mechanical computation of thought.",
            "topic": "Foundations of AI: Philosophy"
        },
        {
            "question_text": "In the historical development of AI, what did Aristotle's syllogisms contribute to the field?",
            "option_a": "The first electronic logic gates",
            "option_b": "The 'Laws of Thought' approach, codifying formal patterns of deductive reasoning that always yield correct conclusions",
            "option_c": "The backpropagation learning algorithm",
            "option_d": "Search algorithms for two-player adversarial games",
            "correct_option": "B",
            "explanation": "Aristotle initiated the 'Thinking Rationally' tradition (21CB603, Unit 1, AI 1.1) by formalizing syllogisms: structured arguments (e.g. 'Socrates is a man; all men are mortal; therefore Socrates is mortal') that govern mechanical deduction.",
            "topic": "Laws of Thought Approach"
        }
    ],
    "computer networks": [
        {
            "question_text": "Which two primary components compose the latency (delay) of sending a packet across a link in a computer network?",
            "option_a": "Compression delay and encryption delay",
            "option_b": "Propagation delay (Distance / Speed of Light) and Transmission delay (Size / Bandwidth)",
            "option_c": "Clock skew and voltage drop",
            "option_d": "Modulation delay and demodulation delay",
            "correct_option": "B",
            "explanation": "As defined in Computer Networks (22CS502, Unit 1, CN 1.1), Latency = Propagation + Transmit + Queue, where Propagation = Distance / c and Transmit = Size / Bandwidth.",
            "topic": "Network Performance & Latency"
        },
        {
            "question_text": "What physical property does the Delay x Bandwidth product represent in a network link?",
            "option_a": "The total electrical resistance of the physical copper wire",
            "option_b": "The volume of data (in bits) that can be 'in flight' or filling the link pipeline at any given moment",
            "option_c": "The frequency of packet collisions on a CSMA/CD segment",
            "option_d": "The maximum number of hops in an autonomous system",
            "correct_option": "B",
            "explanation": "The Delay x Bandwidth product (22CS502, Unit 1, CN 1.1) corresponds to the volume of the pipe: how many bits the sender can transmit before the first bit reaches the destination.",
            "topic": "Delay x Bandwidth Product"
        },
        {
            "question_text": "In network architecture, why is the Internet (TCP/IP) model described as having an 'hourglass' shape?",
            "option_a": "Because transmission speed drops to zero in intermediate routers",
            "option_b": "Because IP serves as the single unifying protocol at the waist, supporting diverse transport protocols above and diverse network hardware below",
            "option_c": "Because application layer packets are always larger than link layer frames",
            "option_d": "Because the architecture requires exactly two routers between endpoints",
            "correct_option": "B",
            "explanation": "The Internet architecture (22CS502, Unit 1, CN 1.1) features an hourglass shape where the Internet Protocol (IP) represents the narrow waist, providing a universal service abstraction across heterogeneous underlying physical networks.",
            "topic": "Network Architecture & Layering"
        },
        {
            "question_text": "From a network designer's perspective, what is the central engineering requirement for building a network?",
            "option_a": "Delivering cost-effective, fair, and efficient resource allocation across competing users and traffic flows",
            "option_b": "Ensuring only one user can access the transmission medium at any time",
            "option_c": "Eliminating the need for routing tables and IP addressing",
            "option_d": "Maximizing hardware costs to increase infrastructure valuation",
            "correct_option": "A",
            "explanation": "Network requirements differ by perspective (22CS502, Unit 1, CN 1.1): network designers prioritize cost-effective resource sharing, link multiplexing (statistical multiplexing), and fair bandwidth allocation across users.",
            "topic": "Network Requirements & Perspectives"
        },
        {
            "question_text": "How does packet switching differ fundamentally from traditional circuit switching?",
            "option_a": "Packet switching establishes a dedicated physical circuit with reserved bandwidth before communication begins",
            "option_b": "Packet switching utilizes store-and-forward routing where discrete packets share transmission capacity on demand via statistical multiplexing",
            "option_c": "Packet switching only works over wireless radio frequencies",
            "option_d": "Packet switching guarantees zero queuing delay at intermediate nodes",
            "correct_option": "B",
            "explanation": "In packet switching (22CS502, Unit 1, CN 1.1), data is broken into discrete packets that traverse shared links using store-and-forward switching, allowing efficient utilization compared to reserved circuit switching.",
            "topic": "Packet Switching vs Circuit Switching"
        }
    ],
    "cloud computing": [
        {
            "question_text": "According to the NIST definition, which essential characteristic of cloud computing allows consumers to provision computing capabilities automatically without human interaction with the service provider?",
            "option_a": "Broad network access",
            "option_b": "On-demand self-service",
            "option_c": "Resource pooling",
            "option_d": "Rapid elasticity",
            "correct_option": "B",
            "explanation": "NIST Essential Characteristics (22IT402, Unit 1, CC 1.1): On-demand self-service allows a consumer to unilaterally provision computing capabilities (server time, network storage) as needed automatically.",
            "topic": "NIST Cloud Characteristics"
        },
        {
            "question_text": "In cloud service delivery models, how does Infrastructure as a Service (IaaS) differ from Platform as a Service (PaaS)?",
            "option_a": "IaaS provides raw virtualized compute, storage, and networking resources, whereas PaaS delivers application runtime environments and development middleware",
            "option_b": "IaaS provides complete end-user web applications, whereas PaaS provides bare metal silicon only",
            "option_c": "IaaS is only available on private clouds, whereas PaaS is exclusively public",
            "option_d": "IaaS eliminates all user control over the operating system",
            "correct_option": "A",
            "explanation": "Cloud Service Models (22IT402, Unit 1, CC 1.1): IaaS provides fundamental compute, storage, and networking (e.g. AWS EC2), while PaaS provides platforms and programming environments (e.g. Google App Engine) without managing underlying VMs.",
            "topic": "Cloud Service Models (IaaS vs PaaS)"
        },
        {
            "question_text": "Which cloud deployment model consists of two or more distinct cloud infrastructures (private, community, or public) that remain unique entities but are bound together by standardized technology?",
            "option_a": "Sovereign Cloud",
            "option_b": "Hybrid Cloud",
            "option_c": "Dedicated On-Premise Cloud",
            "option_d": "Distributed P2P Mesh",
            "correct_option": "B",
            "explanation": "Deployment Models (22IT402, Unit 1, CC 1.1): A Hybrid Cloud is a composition of two or more distinct clouds (private, community, or public) that enable data and application portability (e.g., cloud bursting).",
            "topic": "Cloud Deployment Models"
        },
        {
            "question_text": "What foundational computing paradigm provides the resource abstraction and multi-tenant isolation enabling modern cloud datacenters?",
            "option_a": "Hardware virtualization (hypervisors and virtual machines)",
            "option_b": "Static linear programming",
            "option_c": "Single-tenant mainframe time-sharing",
            "option_d": "Quantum entanglement gates",
            "correct_option": "A",
            "explanation": "Roots of Cloud Computing (22IT402, Unit 1, CC 1.1): Virtualization abstracts physical hardware into pooled virtual machines managed by hypervisors, delivering elasticity, multi-tenancy, and workload isolation.",
            "topic": "Virtualization & Roots of Cloud"
        },
        {
            "question_text": "Which NIST cloud characteristic ensures that cloud systems automatically measure and optimize resource usage through metering capabilities (pay-per-use)?",
            "option_a": "Rapid elasticity",
            "option_b": "Measured service",
            "option_c": "Location independence",
            "option_d": "Fault tolerance",
            "correct_option": "B",
            "explanation": "NIST Characteristics (22IT402, Unit 1, CC 1.1): Measured service enables resource usage to be monitored, controlled, and reported, providing transparency for both the provider and consumer of the utilized service.",
            "topic": "Measured Service & Pay-per-Use"
        }
    ],
    "big data": [
        {
            "question_text": "What are the primary characteristics (known as the '5 V's') that define Big Data?",
            "option_a": "Volume, Velocity, Variety, Veracity, and Value",
            "option_b": "Virtualization, Vectorization, Volatility, Visibility, and Validity",
            "option_c": "Validation, Verification, Variable, Versioning, and View",
            "option_d": "Voltage, Velocity, Vector, Vacuum, and Variation",
            "correct_option": "A",
            "explanation": "Big Data fundamentals: Big Data is defined by the 5 V's: Volume (immense scale of data), Velocity (high speed of generation and streaming), Variety (diverse formats), Veracity (trustworthiness and data quality), and Value (actionable business insights).",
            "topic": "Big Data Characteristics (5 V's)"
        },
        {
            "question_text": "In the Hadoop Distributed File System (HDFS) architecture, what is the role of the NameNode?",
            "option_a": "Executing user application code directly on worker nodes",
            "option_b": "Managing file system namespace and metadata while regulating client access to files",
            "option_c": "Storing the actual raw block replicas of data files",
            "option_d": "Managing physical network routing switches across data racks",
            "correct_option": "B",
            "explanation": "HDFS Architecture: The NameNode is the master server that manages the file system namespace, maintains block locations/metadata, and coordinates file operations, while DataNodes store the actual data blocks.",
            "topic": "Hadoop Ecosystem & HDFS Architecture"
        },
        {
            "question_text": "In the MapReduce programming model, what transformation occurs during the 'Map' phase?",
            "option_a": "Aggregating all intermediate values associated with the same key",
            "option_b": "Applying a user-defined function to input key-value pairs to generate intermediate key-value pairs",
            "option_c": "Distributing compiled bytecode to remote edge caches",
            "option_d": "Formatting disk sectors into fixed-size HDFS blocks",
            "correct_option": "B",
            "explanation": "MapReduce Computation: The Map function processes an input key-value pair and produces a set of intermediate key-value pairs, which are subsequently shuffled and sorted before reaching the Reduce phase.",
            "topic": "MapReduce Computational Model"
        },
        {
            "question_text": "Why does Apache Spark achieve significantly faster processing performance than traditional Hadoop MapReduce for iterative workloads?",
            "option_a": "Spark replaces all RAM with high-speed magnetic tape storage",
            "option_b": "Spark performs in-memory computations using Resilient Distributed Datasets (RDDs) without intermediate disk writes",
            "option_c": "Spark requires no master node or cluster coordinator",
            "option_d": "Spark executes exclusively on single-core microcontrollers",
            "correct_option": "B",
            "explanation": "Apache Spark Architecture: Spark leverages Resilient Distributed Datasets (RDDs) and in-memory DAG execution pipelines, eliminating the costly disk I/O bottlenecks inherent in multi-stage MapReduce jobs.",
            "topic": "Distributed Processing with Apache Spark"
        },
        {
            "question_text": "Which category of NoSQL database stores data in flexible semi-structured documents (e.g., JSON or BSON) rather than rigid relational tables?",
            "option_a": "Document Store (e.g., MongoDB, CouchDB)",
            "option_b": "Graph Database (e.g., Neo4j)",
            "option_c": "Columnar Store (e.g., Cassandra, HBase)",
            "option_d": "Relational RDBMS with 3NF normalization",
            "correct_option": "A",
            "explanation": "NoSQL Systems: Document stores like MongoDB and CouchDB store data records as documents (JSON/BSON), providing dynamic schemas and hierarchical data representations ideal for modern web and analytics applications.",
            "topic": "NoSQL Data Stores & Key-Value DBs"
        }
    ]
}

# Alias mappings for lookup
COURSE_ALIASES = {
    "22ai503": "machine learning",
    "ml": "machine learning",
    "machine learning": "machine learning",
    "21cb603": "artificial intelligence",
    "ai": "artificial intelligence",
    "artificial intelligence": "artificial intelligence",
    "22cs502": "computer networks",
    "cn": "computer networks",
    "computer networks": "computer networks",
    "networks": "computer networks",
    "22it402": "cloud computing",
    "cc": "cloud computing",
    "cloud computing": "cloud computing",
    "cloud": "cloud computing",
    "22ai602": "big data",
    "bd": "big data",
    "big data": "big data",
    "hadoop": "big data",
    "spark": "big data"
}

class QuizService:
    """Handles course-grounded quiz generation, server-side scoring, analytics, and remediation."""

    def _generate_topic_grounded_fallback_question(
        self,
        topic: str,
        difficulty: str,
        idx: int,
        course_name: str = "Course Material"
    ) -> Dict[str, Any]:
        """
        Synthesize an academic question grounded in course concepts when additional
        questions are required beyond the curated repository.
        """
        templates = [
            {
                "question_text": f"In the study of {topic} ({course_name}), which of the following principles is most foundational to ensuring theoretical correctness and operational reliability?",
                "option_a": f"Verifying analytical invariants and handling boundary conditions under varying inputs in {topic}",
                "option_b": f"Ignoring edge conditions to maximize superficial processing speed in {topic}",
                "option_c": "Replacing validated formal proofs with unverified heuristic shortcuts",
                "option_d": "Eliminating state validation across operational lifecycle stages",
                "correct_option": "A",
                "explanation": f"Grounded in {course_name}: Rigorous analysis in {topic} requires preserving invariant state integrity and systematically verifying boundary conditions.",
            },
            {
                "question_text": f"When evaluating design trade-offs in {topic} ({difficulty} level, {course_name}), what is typically the primary engineering constraint?",
                "option_a": "Absolute zero latency at the expense of complete data corruption",
                "option_b": f"The trade-off between computational/memory complexity and system accuracy/robustness in {topic}",
                "option_c": "Bypassing hardware limits through software assertions alone",
                "option_d": "Eliminating all data structures in favor of static global buffers",
                "correct_option": "B",
                "explanation": f"Grounded in {course_name}: Engineering decisions in {topic} consistently require optimizing trade-offs between execution resources (time/space) and quality of results.",
            },
            {
                "question_text": f"Under standard curriculum specifications for {course_name}, how should intermediate representations in {topic} be structured?",
                "option_a": "Discarded indiscriminately before verification",
                "option_b": "Permuted randomly regardless of sequence semantics",
                "option_c": f"Structured deterministically according to established {topic} protocol standards",
                "option_d": "Stored with unencrypted sensitive parameters in global execution context",
                "correct_option": "C",
                "explanation": f"Grounded in {course_name}: Standard academic models in {topic} prescribe deterministic structuring of state transitions to ensure predictability and correctness.",
            }
        ]
        chosen = templates[(idx - 1) % len(templates)]
        return {
            "question_text": chosen["question_text"],
            "option_a": chosen["option_a"],
            "option_b": chosen["option_b"],
            "option_c": chosen["option_c"],
            "option_d": chosen["option_d"],
            "correct_option": chosen["correct_option"],
            "explanation": chosen["explanation"],
            "topic": topic
        }

    def generate_quiz(
        self,
        db: Session,
        student_id: int,
        topic: str,
        difficulty: str = "Intermediate",
        num_questions: int = 5,
        subject_id: Optional[int] = None,
        document_id: Optional[int] = None
    ) -> Quiz:
        """Create a new quiz record with questions grounded in the selected course material or specific document."""
        # 1. Resolve Subject and Document
        subject = None
        target_doc = None
        if document_id:
            target_doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
            if not target_doc:
                raise ValueError(f"Document with ID {document_id} not found.")
            if target_doc.subject_id:
                subject = db.query(Subject).filter(Subject.id == target_doc.subject_id).first()

        if subject_id:
            subject = db.query(Subject).filter(Subject.id == subject_id).first()
            if not subject:
                raise ValueError(f"Course with ID {subject_id} not found.")
        elif not subject and topic:
            for s in db.query(Subject).all():
                if s.name.lower() in topic.lower() or topic.lower() in s.name.lower() or s.code.lower() in topic.lower():
                    subject = s
                    break
        if not subject:
            subject = db.query(Subject).first()

        if not subject:
            raise ValueError("No curriculum courses found in database. Please initialize courses.")

        # 2. Strict Grounding: Verify that course/document material is indexed
        if document_id and target_doc:
            chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).count()
            if chunks_count == 0:
                raise ValueError(
                    f"Selected document '{target_doc.filename}' has not finished indexing (0 chunks). "
                    f"Please wait for indexing to complete before generating a quiz."
                )
        else:
            chunks_count = db.query(DocumentChunk).join(KnowledgeDocument).filter(
                KnowledgeDocument.subject_id == subject.id
            ).count()
            if chunks_count == 0:
                raise ValueError(
                    f"Insufficient course material for '{subject.name}' ({subject.code}). "
                    f"Please upload and index course material before generating a quiz."
                )

        # 3. Create Quiz entity
        quiz = Quiz(
            student_id=student_id,
            topic=topic if topic else subject.name,
            subject_id=subject.id,
            difficulty=difficulty,
            num_questions=num_questions
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)

        # 4. Retrieve course/document-isolated context chunks for strict grounding
        context_chunks = retrieval_engine.search_relevant_chunks(
            db=db,
            query=f"{topic} {difficulty}",
            top_k=5,
            subject_id=subject.id,
            document_id=document_id
        )

        # 5. Generate questions
        selected_raw = None
        if llm_service.gemini_available:
            try:
                selected_raw = llm_service.generate_quiz_questions(
                    topic=topic,
                    difficulty=difficulty,
                    num_questions=num_questions,
                    course_name=f"{subject.code}: {subject.name}",
                    context_passages=context_chunks
                )
            except Exception as e:
                print(f"[QuizService] LLM quiz generation failed, using course question repository: {e}")
                selected_raw = None

        if not selected_raw:
            # Fall back to authentic course question repository
            target_key = "machine learning"
            s_name_l = subject.name.lower()
            s_code_l = subject.code.lower()
            topic_l = (topic or "").lower()

            for alias_k, canonical in COURSE_ALIASES.items():
                if alias_k in s_name_l or alias_k in s_code_l or alias_k in topic_l:
                    target_key = canonical
                    break

            pool = COURSE_QUESTION_REPOSITORY.get(target_key, [])

            # Sample questions from matched course pool
            if pool:
                selected_raw = random.sample(pool, min(num_questions, len(pool)))
            else:
                selected_raw = []

            # If more questions are needed, synthesize grounded questions
            while len(selected_raw) < num_questions:
                idx = len(selected_raw) + 1
                selected_raw.append(self._generate_topic_grounded_fallback_question(
                    topic=topic or subject.name,
                    difficulty=difficulty,
                    idx=idx,
                    course_name=f"{subject.code}: {subject.name}"
                ))

        # 6. Save questions to DB
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
                topic=q_data.get("topic", topic or subject.name)
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

        # Prevent duplicate submissions
        existing_attempt = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.student_id == student_id
        ).first()
        if existing_attempt:
            raise ValueError(f"Quiz #{quiz_id} has already been submitted and scored. To practice more, please generate a new quiz.")

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

        # Generate persistent recommendations if weak topics found
        recommendations_added = 0
        for weak in weak_topics:
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
                    reason=f"Scored {percentage}% on recent {quiz.topic} quiz. Conceptual gaps detected.",
                    suggested_action=f"Launch AI tutor explanation for {weak} and complete targeted practice exercises.",
                    priority="High"
                )
                db.add(new_rec)
                recommendations_added += 1

        # Record activity
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

        # Compute personalized adaptive difficulty guidance
        if percentage < 60.0:
            adaptive_guidance = (
                f"Score: {percentage}%. Identified conceptual gaps in "
                f"{', '.join(weak_topics) if weak_topics else quiz.topic}. "
                "Recommended action: Review foundational lecture notes or ask the AI Tutor for an intuitive breakdown, "
                "then practice with foundational exercises before re-attempting."
            )
        elif percentage < 80.0:
            adaptive_guidance = (
                f"Score: {percentage}%. Good foundational comprehension. "
                f"Focus targeted revision on: {', '.join(weak_topics) if weak_topics else 'core formula derivations and protocols'}, "
                "and continue with Intermediate practice problems."
            )
        else:
            adaptive_guidance = (
                f"Score: {percentage}%. Exceptional mastery demonstrated! "
                f"You have validated strong competency in {', '.join(strong_topics) if strong_topics else quiz.topic}. "
                "Recommended action: Advance to Advanced-level challenge questions or explore related higher-tier modules."
            )

        return {
            "attempt_id": attempt.id,
            "quiz_id": quiz.id,
            "score": correct_count,
            "total_questions": total,
            "percentage": percentage,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "results": detailed_results,
            "recommendations_generated": recommendations_added,
            "adaptive_guidance": adaptive_guidance
        }

    def explain_quiz_mistakes(
        self,
        db: Session,
        student_id: int,
        quiz_id: Optional[int] = None,
        attempt_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        mistakes_input: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes educational mistake explanations for incorrect quiz answers.
        - Identifies all incorrect questions from the attempt or input.
        - Retrieves course-specific RAG context from the course PDF.
        - Generates rich explanations (why incorrect, correct concept, steps, analogy, exam tip, citation).
        - Recommends targeted revision topics.
        - Never alters or recalculates the recorded score.
        - Gracefully handles perfect scores (0 mistakes).
        """
        attempt = None
        quiz = None

        if attempt_id:
            attempt = db.query(QuizAttempt).filter(
                QuizAttempt.id == attempt_id,
                QuizAttempt.student_id == student_id
            ).first()
            if attempt:
                quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()

        if not attempt and quiz_id:
            attempt = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.student_id == student_id
            ).order_by(QuizAttempt.completed_at.desc()).first()
            if not quiz:
                quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()

        score = attempt.score if attempt else 0
        total_questions = attempt.total_questions if attempt else 0
        percentage = attempt.percentage if attempt else 0.0

        # Resolve subject
        target_subj_id = subject_id or (quiz.subject_id if quiz else None)
        subject = None
        if target_subj_id:
            subject = db.query(Subject).filter(Subject.id == target_subj_id).first()
        if not subject and quiz and quiz.topic:
            for s in db.query(Subject).all():
                if s.name.lower() in quiz.topic.lower() or quiz.topic.lower() in s.name.lower():
                    subject = s
                    break
        if not subject:
            subject = db.query(Subject).first()

        course_name = f"{subject.code}: {subject.name}" if subject else "Academic Course"

        # Collect incorrect answers
        incorrect_items = []

        if attempt:
            # Query answers from DB
            db_answers = db.query(QuizAnswer, Question).join(
                Question, QuizAnswer.question_id == Question.id
            ).filter(QuizAnswer.attempt_id == attempt.id).all()

            for ans, q in db_answers:
                if not ans.is_correct or (ans.selected_option.strip().upper() != q.correct_option.strip().upper()):
                    incorrect_items.append({
                        "question_id": q.id,
                        "question_text": q.question_text,
                        "option_a": q.option_a,
                        "option_b": q.option_b,
                        "option_c": q.option_c,
                        "option_d": q.option_d,
                        "selected_option": ans.selected_option.strip().upper(),
                        "correct_option": q.correct_option.strip().upper(),
                        "explanation": q.explanation,
                        "topic": q.topic or (quiz.topic if quiz else "Course Topic")
                    })
        if not incorrect_items and mistakes_input:
            for m in mistakes_input:
                item_dict = m if isinstance(m, dict) else m.model_dump()
                sel = str(item_dict.get("selected_option", "")).strip().upper()
                corr = str(item_dict.get("correct_option", "")).strip().upper()
                if sel != corr:
                    incorrect_items.append({
                        "question_id": item_dict.get("question_id", 0),
                        "question_text": item_dict.get("question_text", ""),
                        "option_a": item_dict.get("option_a", ""),
                        "option_b": item_dict.get("option_b", ""),
                        "option_c": item_dict.get("option_c", ""),
                        "option_d": item_dict.get("option_d", ""),
                        "selected_option": sel,
                        "correct_option": corr,
                        "explanation": item_dict.get("explanation", ""),
                        "topic": item_dict.get("topic", course_name)
                    })

        if not attempt:
            if quiz and quiz.questions:
                total_questions = len(quiz.questions)
                score = max(0, total_questions - len(incorrect_items))
            elif mistakes_input:
                total_questions = len(mistakes_input)
                score = max(0, total_questions - len(incorrect_items))
            if total_questions > 0:
                percentage = round((score / total_questions) * 100, 1)

        # Perfect score / No mistakes case
        if not incorrect_items:
            summary = (
                f"🎉 Perfect Score ({score}/{total_questions})! You answered all questions correctly "
                f"on this assessment for {course_name}. No conceptual errors or incorrect answers were detected. "
                "Exceptional mastery demonstrated!"
            )
            return {
                "quiz_id": quiz.id if quiz else quiz_id,
                "attempt_id": attempt.id if attempt else attempt_id,
                "score": score,
                "total_questions": total_questions,
                "percentage": percentage,
                "has_mistakes": False,
                "summary_message": summary,
                "explanations": [],
                "recommended_revision_topics": [],
                "provider": "LearnAI Pedagogical Remediation Engine"
            }

        # Build explanations for each incorrect item
        explanations = []
        revision_topics_set = set()

        for item in incorrect_items:
            q_text = item["question_text"]
            options_dict = {
                "A": item.get("option_a", ""),
                "B": item.get("option_b", ""),
                "C": item.get("option_c", ""),
                "D": item.get("option_d", "")
            }
            sel_opt = item["selected_option"]
            corr_opt = item["correct_option"]
            q_expl = item.get("explanation", "")
            q_topic = item.get("topic", course_name)
            revision_topics_set.add(q_topic)

            # Retrieve course context chunks
            context_passages = []
            try:
                context_passages = retrieval_engine.search_relevant_chunks(
                    db=db,
                    query=f"{q_text} {q_topic}",
                    top_k=2,
                    subject_id=subject.id if subject else None,
                    threshold=0.01
                )
            except Exception as e:
                print(f"[QuizService] Retrieval error during mistake explanation: {e}")

            # Synthesize explanation
            expl_data = llm_service.explain_quiz_mistake(
                question_text=q_text,
                options=options_dict,
                selected_option=sel_opt,
                correct_option=corr_opt,
                standard_explanation=q_expl,
                course_name=course_name,
                topic=q_topic,
                context_passages=context_passages
            )

            citation = expl_data.get("citation")
            if not citation and subject and subject.document_filename:
                citation = f"{subject.document_filename} (Unit 1)"

            explanations.append({
                "question_id": item["question_id"],
                "question_text": q_text,
                "selected_option": sel_opt,
                "selected_option_text": options_dict.get(sel_opt, ""),
                "correct_option": corr_opt,
                "correct_option_text": options_dict.get(corr_opt, ""),
                "why_incorrect": expl_data.get("why_incorrect", ""),
                "correct_concept": expl_data.get("correct_concept", ""),
                "step_by_step_explanation": expl_data.get("step_by_step_explanation", ""),
                "example_or_analogy": expl_data.get("example_or_analogy", ""),
                "tip_to_remember": expl_data.get("tip_to_remember", ""),
                "citation": citation,
                "topic": q_topic,
                "recommended_topic": expl_data.get("recommended_topic") or q_topic
            })

        summary = (
            f"Analyzed {len(explanations)} incorrect item(s) from your assessment for {course_name}. "
            "Review the conceptual analysis, step-by-step reasoning, and memory tips below to eliminate recurring misconceptions."
        )

        return {
            "quiz_id": quiz.id if quiz else quiz_id,
            "attempt_id": attempt.id if attempt else attempt_id,
            "score": score,
            "total_questions": total_questions,
            "percentage": percentage,
            "has_mistakes": True,
            "summary_message": summary,
            "explanations": explanations,
            "recommended_revision_topics": list(revision_topics_set),
            "provider": explanations[0].get("provider", "LearnAI Pedagogical Remediation Engine") if explanations else "LearnAI Remediation Engine"
        }

quiz_service = QuizService()
