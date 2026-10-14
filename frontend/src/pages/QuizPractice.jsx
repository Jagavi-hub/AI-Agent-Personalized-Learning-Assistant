import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

const TOPIC_PRESETS = [
  'Backpropagation & Neural Networks',
  'Gradient Descent & Optimization',
  'Database Normalization (1NF to BCNF)',
  'Convolutional Neural Networks (CNNs)',
  'Transformers & Self-Attention',
  'Graph Algorithms & Dijkstra',
];

export default function QuizPractice() {
  const navigate = useNavigate();
  const { showNotification } = useStudent();

  // Tabs: 'take' or 'history'
  const [activeTab, setActiveTab] = useState('take');

  // Quiz Setup state
  const [selectedTopic, setSelectedTopic] = useState('Backpropagation & Neural Networks');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // question_id -> "A"/"B"/"C"/"D"
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // Review modal state
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Attempt History state
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

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

  const handleStartQuiz = async () => {
    const topicToUse = customTopic.trim() || selectedTopic;
    try {
      setGenerating(true);
      setQuizResult(null);
      setSelectedAnswers({});
      const quiz = await api.generateQuiz(topicToUse, difficulty, numQuestions);
      setActiveQuiz(quiz);
      showNotification(`Quiz generated on "${topicToUse}"`, 'success');
    } catch (err) {
      showNotification('Failed to generate quiz', 'error');
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
        showNotification('Excellent performance! Topic mastered! 🏆', 'success');
      } else {
        showNotification(`Quiz evaluated: ${result.score}/${result.total_questions} (${result.percentage}%)`, 'info');
      }
    } catch (err) {
      showNotification('Failed to submit quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReview = async (attemptId) => {
    try {
      setLoadingReview(true);
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
            Assess conceptual understanding with backend-scored active recall tests.
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
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <Sparkles size={18} color="var(--primary)" />
                    Generate Academic Assessment
                  </div>
                  <div className="card-desc">
                    Configure question pool and difficulty parameters
                  </div>
                </div>
              </div>

              {/* Topic Selector */}
              <div className="input-group">
                <label className="input-label">Select Core Academic Topic</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {TOPIC_PRESETS.map((t) => (
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
                        backgroundColor: selectedTopic === t && !customTopic ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                        borderColor: selectedTopic === t && !customTopic ? 'var(--primary)' : 'var(--border)',
                        color: selectedTopic === t && !customTopic ? 'var(--primary)' : 'var(--text-main)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  className="input-field"
                  placeholder="Or enter custom topic (e.g. Memory Paging, Deadlocks)..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>

              {/* Difficulty and Question Count */}
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Difficulty Tier</label>
                  <select
                    className="input-field"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="Beginner">Beginner (Foundational Definitions)</option>
                    <option value="Intermediate">Intermediate (Analytical / Mechanics)</option>
                    <option value="Advanced">Advanced (Proofs & Architectures)</option>
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
                disabled={generating}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {generating ? (
                  <>
                    <RefreshCw size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <GraduationCap size={18} />
                    Launch Adaptive Quiz
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
                }}
              >
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {activeQuiz.topic}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Difficulty: <strong>{activeQuiz.difficulty}</strong> • Total Questions: {activeQuiz.questions.length}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-primary">
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
                            padding: '0.85rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid',
                            borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                            backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: '2px solid',
                              borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                              color: isSelected ? '#ffffff' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {opt.key}
                          </div>
                          <span style={{ fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', fontWeight: isSelected ? 500 : 400 }}>
                            {opt.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Submit Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
                <button
                  onClick={() => {
                    if (window.confirm('Abandon quiz? Your answers will not be saved.')) {
                      setActiveQuiz(null);
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                >
                  {submitting ? 'Scoring Answers...' : 'Submit Assessment'}
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
                      Assessment Result
                    </div>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#ffffff', margin: '0.25rem 0' }}>
                      {quizResult.score} / {quizResult.total_questions} ({quizResult.percentage}%)
                    </h2>
                    <p style={{ color: '#ffffff', opacity: 0.9, fontSize: '0.925rem' }}>
                      {quizResult.percentage >= 80
                        ? 'Mastery verified! Strong conceptual grasp demonstrated.'
                        : 'Review incorrect items below to address identified conceptual gaps.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => setQuizResult(null)}
                      className="btn"
                      style={{ backgroundColor: '#ffffff', color: '#111827', fontWeight: 600 }}
                    >
                      Take Another Quiz
                    </button>
                    <button
                      onClick={() => navigate('/assistant')}
                      className="btn"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)' }}
                    >
                      <Sparkles size={16} /> Explain Mistakes in AI Chat
                    </button>
                  </div>
                </div>

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

              {/* Detailed Question Review */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Detailed Answer Analysis</h3>
                {quizResult.results?.map((item, idx) => (
                  <div
                    key={item.question_id}
                    className="card"
                    style={{
                      borderLeft: `5px solid ${item.is_correct ? 'var(--success)' : 'var(--danger)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Q{idx + 1}. {item.question_text}
                      </div>
                      <span className={`badge ${item.is_correct ? 'badge-success' : 'badge-danger'}`}>
                        {item.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', margin: '0.5rem 0', display: 'flex', gap: '1.5rem' }}>
                      <span>
                        Your Choice: <strong>Option {item.selected_option || 'None'}</strong>
                      </span>
                      <span>
                        Correct Answer: <strong>Option {item.correct_option}</strong>
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-surface-hover)',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.5rem',
                        lineHeight: 1.5,
                      }}
                    >
                      💡 <strong>Explanation:</strong> {item.explanation}
                    </div>
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
                Historical Assessment Records
              </div>
              <div className="card-desc">Persistent performance tracking for all completed quizzes</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Topic</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Difficulty</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Percentage</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att) => (
                  <tr key={att.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      {new Date(att.completed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {att.topic}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge badge-neutral">{att.difficulty}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {att.score} / {att.total_questions}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge ${att.percentage >= 70 ? 'badge-success' : 'badge-danger'}`}>
                        {att.percentage}%
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenReview(att.id)}
                        className="btn btn-sm btn-secondary"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}

                {attempts.length === 0 && !loadingAttempts && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No quiz attempts found. Go to the "Take Quiz" tab to complete your first assessment!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal for Past Attempt */}
      {reviewData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div className="card-header">
              <div>
                <div className="card-title">Review Attempt: {reviewData.topic}</div>
                <div className="card-desc">
                  Score: {reviewData.score} / {reviewData.total_questions} ({reviewData.percentage}%) •{' '}
                  {new Date(reviewData.completed_at).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setReviewData(null)} className="btn btn-sm btn-secondary">
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {reviewData.answers.map((ans, idx) => (
                <div
                  key={ans.question_id}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface-hover)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      Q{idx + 1}. {ans.question_text}
                    </div>
                    <span className={`badge ${ans.is_correct ? 'badge-success' : 'badge-danger'}`}>
                      {ans.is_correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Your choice: <strong>Option {ans.selected_option}</strong> • Correct: <strong>Option {ans.correct_option}</strong>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', backgroundColor: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    💡 {ans.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
