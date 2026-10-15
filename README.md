# LearnAI — AI Agent-Based Personalized Learning Assistant for Higher Education

**Domain:** Generative AI & Autonomous AI Agents  
**Project Title:** AI Agent-Based Personalized Learning Assistant for Higher Education  
**Application Name:** LearnAI  

### Project Team
* **HEMALATHA A** — AI & Data Science (AI&DS) Department, 3rd Year
* **DIYA S** — AI & Data Science (AI&DS) Department, 3rd Year
* **JAGAVI R** — AI & Data Science (AI&DS) Department, 3rd Year

---

## 1. Executive Overview

**LearnAI** is a production-grade, end-to-end personalized learning platform engineered for higher education students and educators. Rather than acting as a simple conversational chatbot, the platform is driven by an **Autonomous AI Agent Orchestrator** that dynamically coordinates student profiling, diagnostic assessment history, semantic retrieval (RAG) across lecture materials, adaptive quiz evaluations, study schedules, and proactive academic interventions.

### The Central Orchestrated Workflow
```
[Student Struggles with Backpropagation / Database Normalization]
                                 │
                                 ▼
         [Identify Weak Area: Accuracy < 60% in Recent Quizzes]
                                 │
                                 ▼
     [Inspect Learner Context: 3rd Year AI&DS, Visual/Practical Style]
                                 │
                                 ▼
         [RAG Engine: Search Lecture Notes & Extract Page Citations]
                                 │
                                 ▼
   [LLM / Deterministic Fallback: Synthesize Structured Explanation & Formulas]
                                 │
                                 ▼
            [Tool Execution: tool_suggest_revision_weak_topic]
                                 │
                                 ▼
        [Live AI Agent Activity Panel: Display Decision & Metadata]
                                 │
                                 ▼
          [Backend Scoring: Evaluate MCQs & Update Mastery Analytics]
                                 │
                                 ▼
       [Adaptive Study Planner: Schedule Targeted Tasks in 7-Day Plan]
```

---

## 2. System Architecture & Tech Stack

```
mini_project/
├── backend/
│   ├── app/
│   │   ├── agent/          # AI Agent Orchestrator, LLM Intent Classifier & Tool Functions
│   │   ├── api/            # Authenticated FastAPI Route Handlers (JWT Bearer)
│   │   ├── core/           # Config, Argon2 Security, Database Engine, Seed Initializer
│   │   ├── models/         # SQLAlchemy Relational Models (15 Tables)
│   │   ├── retrieval/      # Document Extraction (pypdf), Chunker, TF-IDF Vector Search
│   │   ├── schemas/        # Pydantic Request & Response Validation
│   │   ├── services/       # LLM Service (Gemini + Fallback), Quiz Engine, Planner, Analytics
│   │   └── main.py         # Application Entry Point & Lifespan Hooks
│   ├── tests/
│   │   ├── run_tests.py    # 20 Comprehensive End-to-End Integration Tests
│   │   └── test_backend.py # Integration Test Suite
│   ├── pytest.ini          # Test Configuration
│   └── requirements.txt    # Python Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Persistent Sidebar (10 Nav Items), Topbar, Layout Shell
│   │   ├── context/        # ThemeContext (Light/Dark), StudentContext (Auth & Profile)
│   │   ├── pages/          # 10 Core Module Pages + Login, Signup, Onboarding, ForgotPassword
│   │   │   ├── Dashboard.jsx        # Metrics, Alerts, Study Sprint, Team Credits
│   │   │   ├── Assistant.jsx        # Chat + Interactive AI Agent Activity Panel
│   │   │   ├── MyLearning.jsx       # Curriculum, Goals, Learning Timeline
│   │   │   ├── QuizPractice.jsx     # Adaptive Quiz Generation, Backend Scoring & Review
│   │   │   ├── StudyPlanner.jsx     # 7-Day Adaptive Schedule & Task Management
│   │   │   ├── Recommendations.jsx  # Prioritized Action Items & Curated Resources
│   │   │   ├── KnowledgeBase.jsx    # PDF/TXT Upload, Text Extraction & Semantic Search
│   │   │   ├── Analytics.jsx        # Recharts Analytics, Mastery Distribution, Trends
│   │   │   ├── Profile.jsx          # Academic Profile Configuration
│   │   │   ├── Settings.jsx         # System Preferences & Feedback
│   │   │   ├── Login.jsx            # Two-Column Authentication with 1-Click Demo Accounts
│   │   │   ├── Signup.jsx           # Student Account Registration
│   │   │   ├── ForgotPassword.jsx   # Single-Use Password Reset Flow
│   │   │   └── Onboarding.jsx       # 3-Step Department, Curriculum & Style Personalizer
│   │   ├── services/       # Centralized API Service Client with JWT Injection
│   │   ├── styles/         # CSS Variable Design System (Light & Dark SaaS Themes)
│   │   ├── App.jsx         # React Router v7 with ProtectedRoute Guard
│   │   └── main.jsx        # Application Root
│   ├── package.json
│   └── vite.config.js      # Vite Build & Reverse Proxy Configuration
├── data/
│   └── uploads/            # Ingested PDF and TXT Academic Course Documents
├── .env.example            # Environment Configuration Template
├── pytest.ini              # Root Pytest Configuration
└── README.md
```

### Technology Matrix
* **Frontend:** React 19, Vite 8, React Router v7, Lucide React, Recharts, React Markdown, Remark GFM, Canvas Confetti.
* **Backend:** Python 3.13 / FastAPI, Pydantic 2.x, SQLAlchemy 2.x, SQLite 3.
* **Authentication:** Argon2id (`argon2-cffi`), PyJWT (`HS256`), Google OAuth 2.0 / OpenID Connect backend verification.
* **Knowledge Retrieval:** PyPDF, Scikit-Learn TF-IDF vectorizer & cosine similarity, sliding window chunker.
* **AI & LLM:** Google Gemini API (`gemini-1.5-flash`) via `google.generativeai` with a deterministic, domain-rich offline fallback engine.
* **Testing:** Automated integration test suite (`tests/run_tests.py` — 20/20 passed).

---

## 3. The Ten Core Modules

| # | Module Name | Primary Responsibilities |
|---|---|---|
| **1** | **Student Profile** | Student identity, department, year, semester, enrolled subjects, learning goals, preferred learning styles, and skill levels with persistent database updates. |
| **2** | **AI Learning Assistant** | Intelligent dialogue with real-time **AI Agent Activity Panel** displaying detected requirements, learner context, selected action, executed tools, RAG citations, and response latency. |
| **3** | **My Learning** | Academic curriculum tracking, milestone goals progress, and chronological audit trail of all student activities. |
| **4** | **Quiz & Practice** | AI/fallback question generation across difficulties, radio answer selection, backend evaluation against DB keys, explanations, and review mode. |
| **5** | **Study Planner** | 7-day adaptive schedules targeting diagnosed weak topics, task completion tracking, and custom task scheduling. |
| **6** | **Recommendations** | Prioritized remediation items (High/Medium/Low), curated university courseware (Stanford CS229, MIT OCW, PyTorch), and completion toggles. |
| **7** | **Knowledge Base (RAG)** | Ingests PDF and TXT documents, chunks text with overlap, computes semantic similarity vectors, and returns ranked passages with file and page citations. |
| **8** | **Progress Analytics** | Recharts visualizations for quiz score trends, subject performance comparisons, topic mastery distribution, and student feedback ratings. |
| **9** | **Student Profile** | Complete profile configuration, skill level updating, learning style preferences, and goal tracking. |
| **10** | **Settings** | Theme toggle, security preferences, session management, and qualitative student feedback. |

---

## 4. Evaluator Demo Accounts & Credentials

The SQLite database is pre-seeded with Argon2-hashed credentials for immediate testing:

| Student Name | Email Address | Password | Role / Details |
|---|---|---|---|
| **Jagavi R** | `jagavi.raju@university.edu` | `LearnAI2026Secure` | Team AI&DS, 3rd Year (Active diagnostic: Backpropagation 40%) |
| **Hemalatha A** | `hemalatha.a@university.edu` | `LearnAI2026Secure` | Team AI&DS, 3rd Year |
| **Diya S** | `diya.s@university.edu` | `LearnAI2026Secure` | Team AI&DS, 3rd Year |

*Note: The Login screen includes 1-click quick login buttons to immediately populate and authenticate as any team member.*

---

## 5. Quickstart & Installation Instructions

### Step 1: Open PowerShell in Project Root
```powershell
cd "c:\Users\Jagavi Raju\OneDrive\Desktop\mini_project"
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```
*(Optional)* Set your Google Gemini API key in `.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```
> **Note:** If `GEMINI_API_KEY` is not provided, LearnAI operates flawlessly using its deterministic academic engine, ensuring complete functionality offline.

---

### Step 3: Backend Setup & Startup
1. Install Python dependencies:
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```
2. Initialize database with seed data:
   ```powershell
   python -m app.core.init_db
   ```
3. Start the FastAPI backend server:
   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   * Backend API: `http://127.0.0.1:8000`
   * Swagger Documentation: `http://127.0.0.1:8000/docs`

---

### Step 4: Frontend Setup & Startup
In a separate PowerShell window:
1. Navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies (if not already installed):
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
4. Open your browser and navigate to:
   ```
   http://127.0.0.1:5173
   ```

---

## 6. Running Automated Tests

To run the complete automated test suite verifying all 20 end-to-end integration workflows:
```powershell
python backend/tests/run_tests.py
```

Or run via pytest:
```powershell
python -m pytest backend/tests/test_backend.py -v
```

### Verified Automated Output:
```
=================================================================
Running LearnAI Automated End-to-End Test Suite...
=================================================================
[init_db] Database initialized with Argon2 credentials, project team, and study plans!
[PASS] Database initialized with Argon2 credentials & schema.
[PASS] Test Health Check: OK
[PASS] Test Student Registration: Created account for Alex Chen (Token issued)
[PASS] Test Duplicate Registration Rejection: Blocked duplicate email
[PASS] Test Invalid Credentials Handling: 401 Unauthorized returned
[PASS] Test Login: Successfully verified Argon2 hash and issued JWT
[PASS] Test Seeded Account Login: Logged in as Jagavi R (Team AI&DS)
[PASS] Test Protected Routes: Rejected unauthenticated access with 401
[PASS] Test Student Onboarding: Profile successfully configured and is_onboarded=True
[PASS] Test Password Recovery & Reset: Verified single-use token and updated password
[PASS] Test Study Planner Generation: Generated 7-day schedule 'Exam Sprint: Deep Learning' with 7 tasks
[PASS] Test Study Planner Task Completion: Task marked completed and persisted
[PASS] Test Student Data Isolation: Student A cannot view or modify Student B's data
[PASS] Test AI Tutor Integration: Intent 'Remediate Weak Topic: Backpropagation' (LearnAI Deterministic Academic Engine (Offline Fallback), 0.02ms, thread #41 verified)
[PASS] Test AI Agent: Verified all 7 canonical educational intents, service routing, arbitrary tool blocking, and cross-student 403 authorization
[PASS] Test Knowledge Base Ingestion: Ingested 'CS601_Vanishing_Gradients.txt' (1 chunks)
[PASS] Test Semantic Search (RAG): Retrieved source 'CS601_Vanishing_Gradients.txt' with score 0.2759
[PASS] Test Quiz Scoring: Computed score against DB keys, adaptive guidance verified, and duplicate submission rejected
[PASS] Test Progress Analytics: Quizzes: 12, Tasks completed: 12
[PASS] Test Curriculum & Subjects: Verified 4 active subjects (including CS601)
[PASS] Test Student Profile Update: Successfully updated profile attributes and reverted
[PASS] Test Quiz Review: Verified explanation keys for attempt #12
[PASS] Test Recommendations & Resources: Verified toggle and curated external/internal materials
[PASS] Test Feedback Submission: 5-star rating persisted
=================================================================
ALL 20 COMPREHENSIVE END-TO-END TESTS PASSED SUCCESSFULLY!
=================================================================
```

To build and verify the frontend production bundle (optimized with Vite code-splitting):
```powershell
cd frontend
npm run build
```
*(Builds in ~600ms, chunk size 170 kB, zero warnings).*

---

## 7. Database Entity Relationship Overview

The persistent SQLite schema (`learnai.db`) contains 15 relational tables:
* `students`: Core profile, Argon2 password hash, auth provider, style preferences, skill tiers, enrolled subjects.
* `subjects`: Academic course syllabus, credit units, semester mappings.
* `study_plans`: 7-day schedules, target dates, study hour allocations.
* `study_tasks`: Individual daily study tasks, topics, priorities, and completion flags.
* `learning_goals`: Personal milestones, target dates, progress percentages.
* `learning_activities`: Complete chronological event trail of student actions.
* `quizzes`: Topic, difficulty tier, number of questions.
* `questions`: Multiple-choice questions, options A-D, answer keys, explanations.
* `quiz_attempts`: Computed score, percentage, timestamp.
* `quiz_answers`: Individual submitted choices and correctness flags.
* `knowledge_documents`: Uploaded document metadata, file paths, chunk count.
* `document_chunks`: Extracted text chunks, page numbers, vector metadata.
* `conversations`: Discussion sessions tied to student profiles.
* `chat_messages`: User and assistant messages, agent decision metadata, RAG citations.
* `recommendations`: Action items, priority levels, completion status.
* `feedbacks`: Star ratings, categories, qualitative student commentary.

---

## 8. Academic Integrity & Prototype Disclosures

1. **Robust Authentication:** Secure email/password login using Argon2id hashing and JWT Bearer tokens, with Google OAuth token verification and strict student data isolation.
2. **Transparent Fallbacks:** When Gemini API keys are unconfigured or unavailable, responses are clearly badged as *LearnAI Deterministic Academic Engine (Offline Fallback)* rather than fabricated LLM outputs.
3. **Strict Scoring:** All quiz scores are calculated on the backend from actual user selections and correct answer keys stored in the database.
4. **Authentic Citations:** RAG citations only reference genuine uploaded files and page numbers found in the database index.
5. **AI Agent Activity Panel:** Provides live transparency into the agent's internal decision lifecycle: detected intent, learner context used, tool executed, citations, and latency benchmark.

---

## 9. License & Credits

Developed as a College Mini Project in Generative AI & Autonomous AI Agents.  
**Project Team:**
* **HEMALATHA A** — AI & Data Science (AI&DS) Department, 3rd Year
* **DIYA S** — AI & Data Science (AI&DS) Department, 3rd Year
* **JAGAVI R** — AI & Data Science (AI&DS) Department, 3rd Year
