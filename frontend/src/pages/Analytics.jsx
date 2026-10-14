import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Star,
  MessageSquare,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function Analytics() {
  const { profile, showNotification } = useStudent();
  const [analytics, setAnalytics] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feedback form state
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('AI Learning Assistant');
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [analyticsData, feedbackData] = await Promise.all([
        api.getProgressAnalytics(),
        api.getFeedback(),
      ]);
      setAnalytics(analyticsData);
      setFeedbacks(feedbackData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      const newFb = await api.submitFeedback({
        rating,
        category,
        comment,
      });
      setFeedbacks((prev) => [newFb, ...prev]);
      setComment('');
      showNotification('Thank you! Your feedback has been recorded.', 'success');
    } catch (err) {
      showNotification('Failed to submit feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const trendData = analytics?.quiz_trend || [];
  const subjectData = analytics?.subject_performance || [];
  const topicData = analytics?.all_topic_performance || [];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Progress Analytics & Mastery Audit</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Empirical assessment metrics and topic-level mastery derived strictly from stored database evaluations.
        </p>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid-4">
        <div className="card">
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Overall Average Score
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {analytics?.average_score_percentage || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Across all attempts
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Total Quizzes Taken
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {analytics?.total_quizzes_taken || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Evaluated by backend
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Mastered Topics (≥75%)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
            {analytics?.topics_mastered_count || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Strong recall demonstrated
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Weak Topics (&lt;60%)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: analytics?.weak_topics_count > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
            {analytics?.weak_topics_count || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Priority revision focus
          </div>
        </div>
      </div>

      {/* Two Column Charts: Trend Line & Subject Performance */}
      <div className="grid-2">
        {/* Chart 1: Quiz Score Trend */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={18} color="var(--primary)" />
                Quiz Score Trend Over Time
              </div>
              <div className="card-desc">Chronological progression of assessment scores (%)</div>
            </div>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    formatter={(val) => [`${val}%`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ fill: '#4f46e5', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No score trend data. Take a quiz to populate trend.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Subject Performance */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BarChart3 size={18} color="var(--primary)" />
                Subject-Wise Performance
              </div>
              <div className="card-desc">Average percentage scores by enrolled course code</div>
            </div>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            {subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="subject_code" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    formatter={(val) => [`${val}%`, 'Avg Score']}
                  />
                  <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No subject scores recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topic Mastery Breakdown */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Award size={18} color="var(--primary)" />
              Topic Mastery Audit Table
            </div>
            <div className="card-desc">Granular breakdown based on all submitted questions</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Academic Topic</th>
                <th style={{ padding: '0.75rem 1rem' }}>Questions Evaluated</th>
                <th style={{ padding: '0.75rem 1rem' }}>Correct Answers</th>
                <th style={{ padding: '0.75rem 1rem' }}>Mastery Rate</th>
                <th style={{ padding: '0.75rem 1rem' }}>Classification</th>
                <th style={{ padding: '0.75rem 1rem' }}>System Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {topicData.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {t.topic}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {t.total_questions}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {t.correct_questions}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                    {t.mastery_percentage}%
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      className={`badge ${
                        t.status === 'Strong'
                          ? 'badge-success'
                          : t.status === 'Weak'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {t.status === 'Weak'
                      ? '⚠️ Priority revision with AI Assistant recommended'
                      : t.status === 'Strong'
                      ? '✓ Retained. Target next advanced module'
                      : 'Maintain practice routine'}
                  </td>
                </tr>
              ))}

              {topicData.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No topic evaluations available yet. Take a quiz to populate mastery audit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Feedback & Rating Module */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <MessageSquare size={18} color="var(--primary)" />
              Learner Feedback & Experience Rating
            </div>
            <div className="card-desc">Help improve the AI Agent's pedagogical recommendations</div>
          </div>
        </div>

        <form onSubmit={handleFeedbackSubmit} style={{ maxWidth: '650px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Rating:</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: s <= rating ? '#f59e0b' : 'var(--border)',
                    padding: '2px',
                  }}
                >
                  <Star size={24} fill={s <= rating ? '#f59e0b' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="AI Learning Assistant">AI Learning Assistant</option>
              <option value="Quiz & Adaptive Practice">Quiz & Adaptive Practice</option>
              <option value="Knowledge Retrieval (RAG)">Knowledge Retrieval (RAG)</option>
              <option value="Recommendations & Study Plans">Recommendations & Study Plans</option>
              <option value="Overall Platform Usability">Overall Platform Usability</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Comments & Suggestions</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Tell us what helped your learning or what concepts the assistant should explain better..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submittingFeedback}
            className="btn btn-primary"
          >
            <Send size={15} />
            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>

        {/* Previous Feedback List */}
        {feedbacks.length > 0 && (
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Submitted Feedback History:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface-hover)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-primary">{fb.category}</span>
                      <div style={{ display: 'flex', color: '#f59e0b' }}>
                        {[...Array(fb.rating)].map((_, i) => (
                          <Star key={i} size={13} fill="#f59e0b" />
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {fb.comment && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                      "{fb.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
