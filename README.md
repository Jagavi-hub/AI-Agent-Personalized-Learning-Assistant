# LearnAI — AI Agent-Based Personalized Learning Assistant for Higher Education

**Domain:** Generative AI & Autonomous AI Agents  
**Project Title:** AI Agent-Based Personalized Learning Assistant for Higher Education  

---

## 1. Executive Overview

**LearnAI** is a comprehensive, production-grade academic prototype designed for higher education students and educators. Rather than behaving as a simple conversational chatbot, the platform is anchored by an **AI Agent Orchestrator** that dynamically coordinates student profiling, diagnostic performance history, semantic retrieval (RAG) across lecture materials, adaptive quiz evaluations, and personalized study interventions.

### The Central Orchestrated Workflow
```
[Student Struggles with Backpropagation]
                 │
                 ▼
[Identify Weak Area: Accuracy < 60% in Recent Quiz]
                 │
                 ▼
[Inspect Profile: 3rd Year CS, Visual/Practical Style, Intermediate Tier]
                 │
                 ▼
[RAG Engine: Search Lecture Notes & Extract Page Citations]
                 │
                 ▼
[LLM / Deterministic Fallback: Synthesize Structured Explanation & Formulas]
                 │
                 ▼
[Adaptive Practice: Generate Targeted Diagnostic MCQs]
                 │
                 ▼
[Backend Scoring: Evaluate Answers & Update Mastery Analytics]
                 │
                 ▼
[Generate Proactive Recommendations & Update Study Roadmap]
```

---

## 2. System Architecture & Tech Stack

```
mini_project/
├── backend/
│   ├── app/
│   │   ├── agent/          # AI Agent Orchestrator & Intent Classifier
│   │   ├── api/            # Documented FastAPI Route Handlers
│   │   ├── core/           # Config, Database Engine, Seed Initializer
│   │   ├── models/         # SQLAlchemy Relational Models (14 Tables)
│   │   ├── retrieval/      # Document Extraction (pypdf), Chunker, TF-IDF Vector Search
│   │   ├── schemas/        # Pydantic Request & Response Validation
│   │   ├── services/       # LLM Service (Gemini + Fallback), Quiz Engine, Analytics
│   │   └── main.py         # Application Entry Point & Lifespan Hooks
│   ├── tests/
│   │   ├── test_backend.py # Integration Test Suite
│   │   └── run_tests.py    # Automated Test Runner
│   ├── pytest.ini          # Test Configuration
│   └── requirements.txt    # Python Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Persistent Sidebar, Topbar, Layout Shell
│   │   ├── context/        # ThemeContext (Light/Dark), StudentContext
│   │   ├── pages/          # 9 Core Module Pages
│   │   ├── services/       # Centralized API Service Client
│   │   ├── styles/         # CSS Variable Design System (Light/Dark)
│   │   ├── App.jsx         # React Router v6 Configuration
│   │   └── main.jsx        # Mount Point
│   ├── package.json
│   └── vite.config.js      # Vite Build & Reverse Proxy Configuration
├── data/
│   └── uploads/            # Ingested PDF and TXT Academic Course Documents
├── .env.example            # Environment Template
├── .gitignore
└── README.md
```

### Technology Matrix
* **Frontend:** React 19, Vite 8, React Router v7, Lucide React, Recharts, React Markdown, Remark GFM, Canvas Confetti.
* **Backend:** Python 3.13 / FastAPI, Pydantic 2.x, SQLAlchemy 2.x, SQLite 3.
* **Knowledge Retrieval:** PyPDF, Scikit-Learn TF-IDF vectorizer & cosine similarity, sliding window chunker.
* **AI & LLM:** Google Gemini API (`gemini-1.5-flash`) via `google.generativeai` with a deterministic, domain-rich offline fallback engine.
* **Testing:** Pytest & automated integration test runner.

---

## 3. The Nine Core Modules

| # | Module Name | Primary Responsibilities |
|---|---|---|
| **1** | **Student Profile** | Student identity, department, year, semester, enrolled subjects, learning goals, preferred learning styles, and skill levels with persistent database updates. |
| **2** | **Learning History & Performance** | Tracks quiz attempts, topic-wise accuracy, and activity timestamps. Dynamically identifies weak areas (<60%) and strong areas (≥75%). |
| **3** | **AI Agent Orchestrator** | 10-step lifecycle: loads profile, assesses weak areas, classifies intent, invokes tools, retrieves RAG context, synthesizes explanations, records interaction, and updates recommendations. |
| **4** | **Generative AI / LLM** | Dual-mode academic generator: live Gemini API when key is configured, or an intelligent offline deterministic academic engine covering core CS & AI topics. |
| **5** | **Knowledge Base & Retrieval** | Ingests PDF and TXT documents, chunks text with overlap, computes semantic similarity vectors, and returns ranked passages with file and page citations. |
| **6** | **Personalized Learning** | Structured study plans, prioritized remediation items (High/Medium/Low), and completion tracking persisted in SQLite. |
| **7** | **Quiz & Practice** | AI/fallback question generation across difficulties, radio answer selection, backend evaluation against DB keys, explanations, and review mode. |
| **8** | **Resource Recommendations** | Curated university courseware (Stanford CS229, MIT OCW, PyTorch) and internal uploaded knowledge materials. |
| **9** | **Progress Analytics & Feedback** | Recharts visualizations for quiz score trends, subject performance comparisons, topic mastery distribution, and student feedback ratings. |

---

## 4. Prerequisites

* **Python:** 3.10+ (Tested on Python 3.13.2)
* **Node.js:** 18+ (Tested on Node.js v24.12.0, npm 11.6.2)
* **Operating System:** Windows, macOS, or Linux

---

## 5. Quickstart & Installation Instructions

### Step 1: Clone or Navigate to the Workspace
```powershell
cd "c:\Users\Jagavi Raju\OneDrive\Desktop\mini_project"
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```
*(Optional)* Open `.env` and add your Google Gemini API key if you want live LLM generation:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note:** If `GEMINI_API_KEY` is left blank, the system automatically uses its rich, deterministic academic knowledge engine, guaranteeing full functionality without external API dependencies.

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
   * Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

---

### Step 4: Frontend Setup & Startup
In a new terminal window:
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

To run the complete automated test suite verifying all 11 core integration workflows:
```powershell
cd backend
python tests/run_tests.py
```

### Expected Output:
```
============================================================
Running LearnAI Automated Backend Test Suite...
============================================================
[PASS] Database initialized and verified.
[PASS] Test Health Check: OK
[PASS] Test Student Profile Retrieval: Jagavi Raju (Computer Science & Engineering)
[PASS] Test Student Profile Update: Successfully persisted
[PASS] Test Subjects List: 4 active academic subjects verified
[PASS] Test AI Agent Orchestration: Detected intent 'Remediate Weak Topic: Backpropagation'
[PASS] Test AI Agent Study Plan Generation: Generated structured phases
[PASS] Test Document Upload: Ingested 'CS602_Normalization_Guide.txt' (1 chunk(s))
[PASS] Test Knowledge Retrieval (RAG): Found 2 passage(s) with source 'CS601_Lecture4_Backpropagation_Notes.txt' (Score: 0.1211)
[PASS] Test Quiz Generation: Created Quiz with 3 questions
[PASS] Test Quiz Scoring: Computed score against DB key
[PASS] Test Quiz Attempt Review: Verified explanations and answer keys
[PASS] Test Progress Analytics: Quizzes and score averages verified
[PASS] Test Recommendations: Active recommendations verified and toggled
[PASS] Test Learning Resource Recommendations: Verified curated and internal materials
[PASS] Test Feedback Submission: Saved 5-star rating to database
============================================================
ALL 11 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!
============================================================
```

To build and verify the frontend production bundle:
```powershell
cd frontend
npm run build
```

---

## 7. Database Entity Relationship Overview

The persistent SQLite schema (`learnai.db`) contains 14 relational tables:
* `students`: Core profile, style preferences, skill tiers, enrolled subjects.
* `subjects`: Academic course syllabus, credit units, semester mappings.
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

1. **Authentication:** Designed for an academic single-user prototype (Student ID 1) without multi-tenant login friction.
2. **Transparent Fallbacks:** When Gemini API keys are unconfigured, responses are clearly badged as *LearnAI Deterministic Academic Engine (Offline Fallback)* rather than fabricated LLM outputs.
3. **Strict Scoring:** All quiz scores are calculated on the backend from actual user selections and correct answer keys stored in the database.
4. **Authentic Citations:** RAG citations only reference genuine uploaded files and page numbers found in the database index.

---

## 9. License & Credits

Developed as an Academic Mini Project in Generative AI & Autonomous AI Agents.  
Created by **Jagavi Raju** — Computer Science & Engineering.
