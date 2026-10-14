import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  BrainCircuit,
  Clock,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function Dashboard() {
  const { profile } = useStudent();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [analyticsData, recsData, subjData] = await Promise.all([
          api.getProgressAnalytics(),
          api.getRecommendations(),
          api.getSubjects(),
        ]);
        setAnalytics(analyticsData);
        setRecommendations(recsData);
        setSubjects(subjData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const weakTopics = analytics?.weak_topics || [];
  const primaryWeakTopic = weakTopics.length > 0 ? weakTopics[0].topic : 'Backpropagation';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Personalized Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem 2.25rem',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '750px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={13} color="#a5b4fc" />
            <span>AI-Driven Adaptive Learning System</span>
          </div>

          <h1 style={{ fontSize: '1.875rem', color: '#ffffff', marginBottom: '0.5rem', fontWeight: 700 }}>
            Welcome back, {profile?.name || 'Jagavi'}!
          </h1>
          <p style={{ color: '#c7d2fe', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            LearnAI has reviewed your recent quiz submissions and curriculum progress in{' '}
            <strong>{profile?.department || 'Computer Science & Engineering'}</strong>. Let's target your focus areas today.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/assistant')}
              className="btn"
              style={{
                backgroundColor: '#ffffff',
                color: '#1e1b4b',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Sparkles size={16} color="#4f46e5" />
              Ask AI Assistant
            </button>
            <button
              onClick={() => navigate('/quiz')}
              className="btn"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <GraduationCap size={16} />
              Take Practice Quiz
            </button>
          </div>
        </div>

        {/* Ambient Graphic Element */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            opacity: 0.1,
            pointerEvents: 'none',
          }}
        >
          <BrainCircuit size={280} color="#ffffff" />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid-4">
        {/* Card 1: Average Score */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>Average Mastery</span>
            <div style={{ padding: '6px', backgroundColor: 'var(--primary-light)', borderRadius: '8px' }}>
              <TrendingUp size={18} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {analytics?.average_score_percentage || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Across {analytics?.total_quizzes_taken || 0} completed assessment(s)
          </div>
        </div>

        {/* Card 2: Quizzes Completed */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>Quizzes Taken</span>
            <div style={{ padding: '6px', backgroundColor: 'var(--accent-blue-light)', borderRadius: '8px' }}>
              <GraduationCap size={18} color="var(--accent-blue)" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {analytics?.total_quizzes_taken || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Persistent database records
          </div>
        </div>

        {/* Card 3: Weak Topics */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>Weak Topics Flagged</span>
            <div style={{ padding: '6px', backgroundColor: 'var(--warning-light)', borderRadius: '8px' }}>
              <AlertTriangle size={18} color="var(--warning)" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: weakTopics.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {weakTopics.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {weakTopics.length > 0 ? `Needs revision: ${primaryWeakTopic}` : 'All topics above 60% threshold'}
          </div>
        </div>

        {/* Card 4: Study Goals */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>Goals Completed</span>
            <div style={{ padding: '6px', backgroundColor: 'var(--success-light)', borderRadius: '8px' }}>
              <CheckCircle size={18} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {analytics?.study_goals_completed || 0} / {analytics?.total_study_goals || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Curriculum milestones
          </div>
        </div>
      </div>

      {/* Weak Topic Alert & Orchestration Box */}
      {weakTopics.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--warning-light)',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={24} color="#d97706" />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.95rem' }}>
                AI Learning Alert: Remediation Required for "{primaryWeakTopic}"
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#b45309', marginTop: '0.2rem' }}>
                Recent diagnostic score ({weakTopics[0]?.mastery_percentage || 40}%) identified conceptual gaps in gradient flow. The AI Agent has retrieved lecture notes and created practice questions.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/assistant')}
              className="btn btn-sm"
              style={{ backgroundColor: '#d97706', color: '#ffffff' }}
            >
              <Sparkles size={14} />
              Revise with AI Agent
            </button>
            <button
              onClick={() => navigate('/quiz')}
              className="btn btn-secondary btn-sm"
            >
              Practice Quiz
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout: Recommendations & Subjects */}
      <div className="grid-2">
        {/* Left: Recommended Actions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Compass size={18} color="var(--primary)" />
                Recommended Next Actions
              </div>
              <div className="card-desc">Personalized based on performance and learning style</div>
            </div>
            <Link to="/recommendations" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              View All
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span
                      className={`badge ${
                        rec.priority === 'High' ? 'badge-danger' : 'badge-primary'
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {rec.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {rec.reason}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.4rem', fontWeight: 500 }}>
                    💡 Action: {rec.suggested_action}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/assistant')}
                  className="btn btn-sm btn-accent"
                  style={{ flexShrink: 0 }}
                >
                  Start
                </button>
              </div>
            ))}

            {recommendations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No pending recommendations. Take a quiz to generate new recommendations!
              </div>
            )}
          </div>
        </div>

        {/* Right: Enrolled Subjects */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BookOpen size={18} color="var(--primary)" />
                Enrolled Academic Subjects
              </div>
              <div className="card-desc">Semester 6 curriculum & syllabus coverage</div>
            </div>
            <Link to="/my-learning" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              Curriculum Details
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {subjects.map((subj) => (
              <div
                key={subj.id}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-neutral">{subj.code}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {subj.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {subj.credits} Credits • {subj.semester}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/quiz')}
                  className="btn btn-sm btn-secondary"
                >
                  Quiz
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Clock size={18} color="var(--primary)" />
              Recent Learning Activities
            </div>
            <div className="card-desc">Audit trail of interactions, assessments, and agent interventions</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {analytics?.recent_activities?.slice(0, 5).map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {act.description}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}

          {(!analytics?.recent_activities || analytics.recent_activities.length === 0) && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No activities recorded yet. Start by asking a question or taking a quiz!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
