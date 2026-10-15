import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Award,
  AlertTriangle,
  History,
  BookOpen,
  FileText,
  Lightbulb,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function QuizPractice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useStudent();

  // Tabs: 'take' or 'history'
  const [activeTab, setActiveTab] = useState('take');

  // Subjects / Courses from backend
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  // Quiz Setup state
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // question_id -> "A"/"B"/"C"/"D"
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // In-place AI Mistake Explanations state
  const [mistakeExplanations, setMistakeExplanations] = useState(null);
  const [loadingExplanations, setLoadingExplanations] = useState(false);
  const [explanationError, setExplanationError] = useState(null);

  // Review modal state
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [modalExplanations, setModalExplanations] = useState(null);
  const [loadingModalExplanations, setLoadingModalExplanations] = useState(false);

  // Attempt History state
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Load courses on mount and inspect URL query params
  useEffect(() => {
    async function initSubjects() {
      try {
        const subjs = await api.getSubjects();
        setSubjects(subjs || []);

        const queryParams = new URLSearchParams(location.search);
        const subjParam = queryParams.get('subject');
        const topicParam = queryParams.get('topic');

        let targetSubj = null;
        if (subjParam) {
          targetSubj = subjs.find((s) => String(s.id) === String(subjParam));
        }
        if (!targetSubj && subjs.length > 0) {
          targetSubj = subjs[0];
        }

        if (targetSubj) {
          setSelectedSubjectId(targetSubj.id);
          setSelectedDocumentId(null);
          if (topicParam) {
            setSelectedTopic(topicParam);
          } else if (targetSubj.topics && targetSubj.topics.length > 0) {
            setSelectedTopic(targetSubj.topics[0]);
          } else {
            setSelectedTopic(targetSubj.name);
          }
        }
      } catch (err) {
        console.error('Failed to load curriculum courses for quiz:', err);
      }
    }
    initSubjects();
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      setLoadingAttempts(true);
      const data = await api.getQuizAttempts();
      setAttempts(data);
    } catch (err) {
      console.error('Failed to load quiz history:', err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleSelectCourse = (subj) => {
    setSelectedSubjectId(subj.id);
    setSelectedDocumentId(null);
    if (subj.topics && subj.topics.length > 0) {
      setSelectedTopic(subj.topics[0]);
    } else {
      setSelectedTopic(subj.name);
    }
    setCustomTopic('');
  };

  const selectedCourse = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  const handleStartQuiz = async () => {
    if (!selectedCourse || selectedCourse.num_chunks === 0) {
      showNotification(
        `Cannot generate quiz: "${selectedCourse?.name || 'Selected course'}" contains 0 indexed chunks. Please upload course materials in the Knowledge Base first.`,
        'error'
      );
      return;
    }

    const topicToUse = customTopic.trim() || selectedTopic || selectedCourse?.name || 'Machine Learning';
    try {
      setGenerating(true);
      setQuizResult(null);
      setSelectedAnswers({});
      setMistakeExplanations(null);
      setExplanationError(null);
      const quiz = await api.generateQuiz(topicToUse, difficulty, numQuestions, selectedSubjectId, selectedDocumentId);
      setActiveQuiz(quiz);
      showNotification(`Quiz generated for "${topicToUse}" from ${selectedCourse?.name || 'course material'}`, 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to generate quiz', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (questionId, optionKey) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    // Validate that all questions have an answer
    const unanswered = activeQuiz.questions.filter((q) => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      if (!window.confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setMistakeExplanations(null);
      setExplanationError(null);
      const answerPayload = Object.entries(selectedAnswers).map(([qid, opt]) => ({
        question_id: parseInt(qid),
        selected_option: opt,
      }));

      const result = await api.submitQuiz(activeQuiz.id, answerPayload);
      setQuizResult(result);
      setActiveQuiz(null);

      // Trigger celebratory confetti if score >= 80%
      if (result.percentage >= 80) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        showNotification('Excellent performance! Course concepts validated! 🏆', 'success');
      } else {
        showNotification(`Quiz evaluated: ${result.score}/${result.total_questions} (${result.percentage}%)`, 'info');
      }
    } catch (err) {
      showNotification(err.message || 'Failed to submit quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExplainMistakes = async (attemptId = null, quizId = null) => {
    try {
      setLoadingExplanations(true);
      setExplanationError(null);
      const targetAttemptId = attemptId || quizResult?.attempt_id;
      const targetQuizId = quizId || quizResult?.quiz_id;

      let mistakesPayload = undefined;
      if (quizResult?.results) {
        const wrongList = quizResult.results.filter((r) => !r.is_correct);
        if (wrongList.length > 0) {
          mistakesPayload = wrongList.map((r) => ({
            question_id: r.question_id,
            question_text: r.question_text,
            selected_option: r.selected_option || '',
            correct_option: r.correct_option,
            explanation: r.explanation || '',
            topic: selectedCourse?.name || '',
          }));
        }
      }

      const res = await api.explainQuizMistakes({
        quiz_id: targetQuizId,
        attempt_id: targetAttemptId,
        subject_id: selectedSubjectId,
        mistakes: mistakesPayload,
      });

      setMistakeExplanations(res);
      showNotification('AI Tutor pedagogical analysis synthesized!', 'success');
      setTimeout(() => {
        const section = document.getElementById('ai-mistakes-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error('Failed to explain quiz mistakes:', err);
      setExplanationError(err.message || 'Failed to explain mistakes. Please try again.');
      showNotification(err.message || 'Failed to explain mistakes', 'error');
    } finally {
      setLoadingExplanations(false);
    }
  };

  const handleExplainModalMistakes = async (attemptId) => {
    try {
      setLoadingModalExplanations(true);
      const res = await api.getAttemptMistakeExplanations(attemptId);
      setModalExplanations(res);
      showNotification('AI Mistake Explanations generated for Attempt #' + attemptId, 'success');
    } catch (err) {
      console.error('Failed to get attempt mistake explanations:', err);
      showNotification(err.message || 'Failed to load attempt mistake explanations', 'error');
    } finally {
      setLoadingModalExplanations(false);
    }
  };

  const handleOpenReview = async (attemptId) => {
    try {
      setLoadingReview(true);
      setModalExplanations(null);
      const rev = await api.getQuizReview(attemptId);
      setReviewData(rev);
    } catch (err) {
      showNotification('Failed to load attempt review', 'error');
    } finally {
      setLoadingReview(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header with Tab Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Adaptive Quiz & Practice</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Assess conceptual understanding with authentic questions strictly grounded in the 4 course PDFs.
          </p>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-hover)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('take')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'take' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'take' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'take' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Take Quiz
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Attempt History
          </button>
        </div>
      </div>

      {/* TAB 1: TAKE QUIZ */}
      {activeTab === 'take' && (
        <>
          {/* Setup Form (when not currently taking a quiz and no result active) */}
          {!activeQuiz && !quizResult && (
            <div className="card" style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <Sparkles size={18} color="var(--primary)" />
                    Generate Course-Grounded Assessment
                  </div>
                  <div className="card-desc">
                    Select a core academic course and target syllabus topics extracted from lecture notes
                  </div>
                </div>
              </div>

              {/* 1. Course Selection Cards */}
              <div className="input-group">
                <label className="input-label">1. Select Curriculum Course ({subjects.length} Available Courses)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {subjects.map((subj) => {
                    const isSelected = selectedSubjectId === subj.id;
                    const docCount = subj.documents?.length || (subj.document_filename ? 1 : 0);
                    return (
                      <div
                        key={subj.id}
                        onClick={() => handleSelectCourse(subj)}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span className={`badge ${isSelected ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                            {subj.code}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: subj.num_chunks > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {subj.num_chunks || 0} chunks
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)', marginTop: '0.35rem' }}>
                          {subj.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={subj.document_filename}>
                          {docCount > 1
                            ? `📚 ${docCount} Materials`
                            : `📄 ${subj.document_filename || subj.documents?.[0]?.filename || 'PDF'}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Document Scope Selector (if course has multiple materials) */}
              {selectedCourse?.documents && selectedCourse.documents.length > 1 && (
                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} color="var(--primary)" />
                    Specific Course Material Scope (Optional):
                  </label>
                  <select
                    value={selectedDocumentId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSelectedDocumentId(val);
                      if (val) {
                        const matchedDoc = selectedCourse.documents.find((d) => d.id === val);
                        if (matchedDoc && matchedDoc.extracted_topics && matchedDoc.extracted_topics.length > 0) {
                          setSelectedTopic(matchedDoc.extracted_topics[0]);
                        }
                      } else {
                        if (selectedCourse.topics && selectedCourse.topics.length > 0) {
                          setSelectedTopic(selectedCourse.topics[0]);
                        }
                      }
                    }}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="">All Course Materials ({selectedCourse.num_chunks} Chunks Aggregated)</option>
                    {selectedCourse.documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.num_chunks} chunks)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Zero-chunk Warning Banner */}
              {selectedCourse && selectedCourse.num_chunks === 0 && (
                <div
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '0.8125rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Material Not Indexed:</strong> "{selectedCourse.name}" has 0 indexed chunks. Please upload and index documents in the Knowledge Base before launching an assessment.
                  </span>
                </div>
              )}

              {/* 2. Topic Selector */}
              {selectedCourse && (
                <div className="input-group">
                  <label className="input-label">
                    2. Select Syllabus Topic ({selectedCourse.name})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {selectedCourse.topics && selectedCourse.topics.length > 0 ? (
                      selectedCourse.topics.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setSelectedTopic(t);
                            setCustomTopic('');
                          }}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            border: '1px solid',
                            cursor: 'pointer',
                            backgroundColor: selectedTopic === t && !customTopic ? 'var(--primary)' : 'var(--bg-surface-hover)',
                            borderColor: selectedTopic === t && !customTopic ? 'var(--primary)' : 'var(--border)',
                            color: selectedTopic === t && !customTopic ? '#ffffff' : 'var(--text-main)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {t}
                        </button>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        Full {selectedCourse.name} Syllabus
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    className="input-field"
                    placeholder={`Or enter custom topic within ${selectedCourse.name}...`}
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                  />
                </div>
              )}

              {/* 3. Difficulty and Question Count */}
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Difficulty Tier</label>
                  <select
                    className="input-field"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="Beginner">Beginner (Foundational Definitions & Terminology)</option>
                    <option value="Intermediate">Intermediate (Analytical Concepts & Mechanics)</option>
                    <option value="Advanced">Advanced (Architectural Trade-offs & Derivations)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Number of Questions</label>
                  <select
                    className="input-field"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  >
                    <option value={3}>3 Questions (Quick Diagnostic)</option>
                    <option value={5}>5 Questions (Standard Assessment)</option>
                    <option value={10}>10 Questions (Comprehensive Exam)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                disabled={generating || (selectedCourse && selectedCourse.num_chunks === 0)}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  opacity: selectedCourse && selectedCourse.num_chunks === 0 ? 0.6 : 1,
                  cursor: selectedCourse && selectedCourse.num_chunks === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {generating ? (
                  <>
                    <RefreshCw size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    Generating Grounded Questions from {selectedCourse?.document_filename || 'PDF'}...
                  </>
                ) : selectedCourse && selectedCourse.num_chunks === 0 ? (
                  <>
                    <AlertTriangle size={18} />
                    Cannot Launch (0 Indexed Chunks)
                  </>
                ) : (
                  <>
                    <GraduationCap size={18} />
                    Launch Adaptive Quiz ({selectedCourse?.name || 'Course'})
                  </>
                )}
              </button>
            </div>
          )}

          {/* ACTIVE QUIZ TAKING VIEW */}
          {activeQuiz && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
              {/* Quiz Status Header */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="badge badge-primary">{selectedCourse?.code || 'Course'}</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {activeQuiz.topic}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Course: <strong>{selectedCourse?.name}</strong> • Source: <strong>{selectedCourse?.document_filename || 'PDF'}</strong> • Tier: <strong>{activeQuiz.difficulty}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '0.8125rem' }}>
                    Answered: {Object.keys(selectedAnswers).length} / {activeQuiz.questions.length}
                  </span>
                </div>
              </div>

              {/* Questions List */}
              {activeQuiz.questions.map((q, idx) => (
                <div key={q.id} className="card">
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {q.question_text}
                    </div>
                  </div>

                  {/* 4 Options Radio List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d },
                    ].map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => handleSelectOption(q.id, opt.key)}
                          style={{
                            padding: '0.85rem 1.15rem',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--text-light)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                              backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                              flexShrink: 0,
                            }}
                          >
                            {opt.key}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                            {opt.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    if (window.confirm('Discard active quiz? Progress will be lost.')) {
                      setActiveQuiz(null);
                    }
                  }}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Discard
                </button>
                <button
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                  style={{ minWidth: '180px' }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      Evaluating Answers...
                    </>
                  ) : (
                    'Submit Assessment'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* QUIZ RESULT VIEW */}
          {quizResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
              {/* Score Summary Banner */}
              <div
                style={{
                  background: quizResult.percentage >= 70 ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)' : 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2rem',
                  color: '#ffffff',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fef3c7' }}>
                      Assessment Result • {selectedCourse?.name || 'Curriculum Course'}
                    </div>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#ffffff', margin: '0.25rem 0' }}>
                      {quizResult.score} / {quizResult.total_questions} ({quizResult.percentage}%)
                    </h2>
                    <p style={{ color: '#ffffff', opacity: 0.9, fontSize: '0.925rem' }}>
                      {quizResult.percentage >= 80
                        ? 'Mastery verified! Strong conceptual grasp of syllabus demonstrated.'
                        : 'Review incorrect items below to address identified conceptual gaps.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setQuizResult(null);
                        setMistakeExplanations(null);
                        setExplanationError(null);
                      }}
                      className="btn"
                      style={{ backgroundColor: '#ffffff', color: '#111827', fontWeight: 600 }}
                    >
                      Take Another Quiz
                    </button>
                    <button
                      onClick={() => handleExplainMistakes()}
                      disabled={loadingExplanations}
                      className="btn"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.45)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontWeight: 600,
                      }}
                    >
                      {loadingExplanations ? (
                        <>
                          <RefreshCw size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          Synthesizing Explanations...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Explain the Mistakes
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/assistant?subject=${selectedSubjectId || ''}`)}
                      className="btn"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      <MessageSquare size={16} /> Open AI Tutor Chat
                    </button>
                  </div>
                </div>

                {/* Adaptive Difficulty & Remediation Guidance */}
                {quizResult.adaptive_guidance && (
                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '0.9rem 1.25rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🎯</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#ffffff' }}>
                        Personalized Adaptive Path:
                      </strong>
                      <span style={{ color: '#fef3c7' }}>{quizResult.adaptive_guidance}</span>
                    </div>
                  </div>
                )}

                {/* Weak / Strong tags */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  {quizResult.weak_topics?.map((wt, idx) => (
                    <span key={idx} style={{ padding: '0.3rem 0.65rem', backgroundColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      ⚠️ Weak Topic: {wt}
                    </span>
                  ))}
                  {quizResult.strong_topics?.map((st, idx) => (
                    <span key={idx} style={{ padding: '0.3rem 0.65rem', backgroundColor: 'rgba(16, 185, 129, 0.3)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      ✓ Mastered: {st}
                    </span>
                  ))}
                </div>
              </div>

              {/* In-place AI Pedagogical Mistake Explanations */}
              {(loadingExplanations || explanationError || mistakeExplanations) && (
                <div id="ai-mistakes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={20} color="var(--primary)" />
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        AI Pedagogical Mistake Explanations
                      </h3>
                    </div>
                    {mistakeExplanations && (
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        {mistakeExplanations.has_mistakes
                          ? `${mistakeExplanations.explanations.length} Concept Analysis Generated`
                          : '100% Mastery Verified'}
                      </span>
                    )}
                  </div>

                  {loadingExplanations && (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                      <RefreshCw size={28} className="spinner" style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 1rem' }} />
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Synthesizing Course-Grounded Explanations...
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '550px', margin: '0 auto' }}>
                        Analyzing your specific options against curriculum reference <strong>{selectedCourse?.document_filename || 'course material'}</strong> and identifying exact conceptual misconceptions.
                      </p>
                    </div>
                  )}

                  {explanationError && !loadingExplanations && (
                    <div
                      className="card"
                      style={{
                        borderLeft: '4px solid var(--danger)',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle size={20} color="var(--danger)" />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{explanationError}</span>
                      </div>
                      <button onClick={() => handleExplainMistakes()} className="btn btn-sm btn-secondary">
                        <RefreshCw size={14} /> Retry Explanation
                      </button>
                    </div>
                  )}

                  {mistakeExplanations && !loadingExplanations && (
                    <>
                      {!mistakeExplanations.has_mistakes ? (
                        <div
                          className="card"
                          style={{
                            borderLeft: '4px solid var(--success)',
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            padding: '1.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <CheckCircle size={24} color="var(--success)" />
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                              🎉 Perfect Score — No Mistakes Detected!
                            </h4>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                            {mistakeExplanations.summary_message}
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <div
                            style={{
                              backgroundColor: 'var(--bg-surface-hover)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '1rem 1.25rem',
                              fontSize: '0.875rem',
                              color: 'var(--text-main)',
                              lineHeight: 1.5,
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                              💡 Diagnostic Overview:
                            </div>
                            <div>{mistakeExplanations.summary_message}</div>
                            {mistakeExplanations.recommended_revision_topics?.length > 0 && (
                              <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                  Recommended Focus Topics:
                                </span>
                                {mistakeExplanations.recommended_revision_topics.map((top, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="badge badge-neutral"
                                    style={{ fontSize: '0.75rem', cursor: 'pointer' }}
                                    onClick={() => navigate(`/assistant?subject=${selectedSubjectId || ''}&query=${encodeURIComponent('Explain the key concepts of ' + top)}`)}
                                    title="Click to ask AI Tutor about this topic"
                                  >
                                    🔍 {top}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {mistakeExplanations.explanations.map((exp, eIdx) => (
                            <div
                              key={eIdx}
                              className="card"
                              style={{
                                borderLeft: '4px solid var(--danger)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                padding: '1.5rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                  <div
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                      color: 'var(--danger)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.85rem',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {eIdx + 1}
                                  </div>
                                  <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', lineHeight: 1.4 }}>
                                      {exp.question_text}
                                    </h4>
                                    {exp.topic && (
                                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem', marginTop: '0.35rem' }}>
                                        Topic: {exp.topic}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="badge badge-danger" style={{ flexShrink: 0 }}>
                                  Incorrect
                                </span>
                              </div>

                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                  gap: '0.75rem',
                                  backgroundColor: 'var(--bg-surface-hover)',
                                  padding: '0.85rem 1rem',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                                    ❌ Your Selected Answer
                                  </span>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)' }}>
                                    Option {exp.selected_option}: {exp.selected_option_text || 'Option ' + exp.selected_option}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                                    ✅ Correct Syllabus Answer
                                  </span>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
                                    Option {exp.correct_option}: {exp.correct_option_text || 'Option ' + exp.correct_option}
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <XCircle size={15} /> Why Your Choice Was Incorrect
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5, paddingLeft: '1.25rem' }}>
                                  {exp.why_incorrect}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <CheckCircle size={15} /> The Correct Concept
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5, paddingLeft: '1.25rem' }}>
                                  {exp.correct_concept}
                                </div>
                              </div>

                              {exp.step_by_step_explanation && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <GraduationCap size={15} /> Step-by-Step Breakdown
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '1.25rem', whiteSpace: 'pre-line' }}>
                                    {exp.step_by_step_explanation}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                                {exp.example_or_analogy && (
                                  <div
                                    style={{
                                      padding: '0.75rem 1rem',
                                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                      borderRadius: 'var(--radius-md)',
                                      fontSize: '0.8125rem',
                                      lineHeight: 1.45,
                                      border: '1px solid rgba(59, 130, 246, 0.2)',
                                    }}
                                  >
                                    <strong style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                                      <Lightbulb size={14} /> Intuitive Analogy:
                                    </strong>
                                    <span style={{ color: 'var(--text-main)' }}>{exp.example_or_analogy}</span>
                                  </div>
                                )}

                                {exp.tip_to_remember && (
                                  <div
                                    style={{
                                      padding: '0.75rem 1rem',
                                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                      borderRadius: 'var(--radius-md)',
                                      fontSize: '0.8125rem',
                                      lineHeight: 1.45,
                                      border: '1px solid rgba(245, 158, 11, 0.2)',
                                    }}
                                  >
                                    <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                                      <Award size={14} /> Exam & Revision Tip:
                                    </strong>
                                    <span style={{ color: 'var(--text-main)' }}>{exp.tip_to_remember}</span>
                                  </div>
                                )}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '0.75rem',
                                  paddingTop: '0.75rem',
                                  borderTop: '1px solid var(--border)',
                                }}
                              >
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <FileText size={13} />
                                  <span>Reference: <strong>{exp.citation || selectedCourse?.document_filename || 'Course Material'}</strong></span>
                                </div>

                                <button
                                  onClick={() => {
                                    const queryText = `I got this quiz question wrong: "${exp.question_text}". I chose Option ${exp.selected_option}, but the correct answer is Option ${exp.correct_option}. Can you explain why in more detail?`;
                                    navigate(`/assistant?subject=${selectedSubjectId || ''}&query=${encodeURIComponent(queryText)}`);
                                  }}
                                  className="btn btn-sm btn-secondary"
                                  style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                >
                                  <MessageSquare size={13} /> Discuss with AI Tutor
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Detailed Question Review List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Detailed Question Analysis & Citations
                </h3>

                {quizResult.results?.map((res, idx) => (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      borderLeft: `4px solid ${res.is_correct ? 'var(--success)' : 'var(--danger)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Q{idx + 1}.</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                          {res.question_text}
                        </span>
                      </div>
                      <span className={`badge ${res.is_correct ? 'badge-success' : 'badge-danger'}`} style={{ flexShrink: 0 }}>
                        {res.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        Your Choice: <strong style={{ color: res.is_correct ? 'var(--success)' : 'var(--danger)' }}>Option {res.selected_option || 'None'}</strong>
                      </div>
                      {!res.is_correct && (
                        <div>
                          Correct Answer: <strong style={{ color: 'var(--success)' }}>Option {res.correct_option}</strong>
                        </div>
                      )}
                    </div>

                    {res.explanation && (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: 'var(--bg-surface-hover)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.8125rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.5,
                          border: '1px solid var(--border)',
                        }}
                      >
                        <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.2rem' }}>
                          📖 Academic Explanation & Source Citation:
                        </strong>
                        {res.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: ATTEMPT HISTORY */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <History size={18} color="var(--primary)" />
                Historical Assessment Records ({attempts.length})
              </div>
              <div className="card-desc">Comprehensive track of past attempts and scores</div>
            </div>
          </div>

          {loadingAttempts ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={24} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : attempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No past attempts recorded. Take your first quiz using the tab above!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Attempt ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Course / Topic</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Difficulty</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Percentage</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date Completed</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((att) => (
                    <tr key={att.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        #{att.id}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {att.topic}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-neutral">{att.difficulty}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {att.score} / {att.total_questions}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${att.percentage >= 80 ? 'badge-success' : att.percentage >= 60 ? 'badge-primary' : 'badge-danger'}`}>
                          {att.percentage}%
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        {new Date(att.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenReview(att.id)}
                          className="btn btn-sm btn-secondary"
                        >
                          Review Answers
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          onClick={() => setReviewData(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Attempt #{reviewData.attempt_id} Review
                </h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {reviewData.topic} • Score: {reviewData.score} / {reviewData.total_questions} ({reviewData.percentage}%)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {reviewData.score < reviewData.total_questions && (
                  <button
                    onClick={() => handleExplainModalMistakes(reviewData.attempt_id)}
                    disabled={loadingModalExplanations}
                    className="btn btn-sm btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {loadingModalExplanations ? (
                      <>
                        <RefreshCw size={13} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        Analyzing Mistakes...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} /> Explain Mistakes with AI
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    setReviewData(null);
                    setModalExplanations(null);
                  }}
                  className="btn btn-sm btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Mistake Explanations (if requested) */}
            {modalExplanations && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    AI Diagnostic Analysis ({modalExplanations.explanations?.length || 0} Mistakes)
                  </h4>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  {modalExplanations.summary_message}
                </div>
                {modalExplanations.explanations?.map((mExp, mIdx) => (
                  <div
                    key={mIdx}
                    style={{
                      borderLeft: '3px solid var(--danger)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      Q: {mExp.question_text}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                        Your Choice: Option {mExp.selected_option}
                      </span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        Correct Choice: Option {mExp.correct_option}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--danger)' }}>Misconception:</strong> {mExp.why_incorrect}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--success)' }}>Correct Concept:</strong> {mExp.correct_concept}
                    </div>
                    {mExp.tip_to_remember && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        <strong style={{ color: '#d97706' }}>Exam Tip:</strong> {mExp.tip_to_remember}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviewData.answers?.map((ans, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: `1px solid ${ans.is_correct ? 'var(--success)' : 'var(--danger)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Q{idx + 1}. {ans.question_text}
                    </span>
                    <span className={`badge ${ans.is_correct ? 'badge-success' : 'badge-danger'}`} style={{ flexShrink: 0 }}>
                      {ans.is_correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Your Choice: <strong>Option {ans.selected_option || 'None'}</strong> | Correct Answer: <strong style={{ color: 'var(--success)' }}>Option {ans.correct_option}</strong>
                  </div>

                  {ans.explanation && (
                    <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                      📖 <strong>Citation & Explanation:</strong> {ans.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
