import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Target,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  ChevronRight,
  FileText,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function MyLearning() {
  const navigate = useNavigate();
  const { profile, showNotification } = useStudent();
  const [subjects, setSubjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Goal Modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Academic');
  const [newGoalDate, setNewGoalDate] = useState('Nov 15, 2026');

  useEffect(() => {
    loadLearningData();
  }, []);

  const loadLearningData = async () => {
    try {
      setLoading(true);
      const [subjData, goalsData, actsData] = await Promise.all([
        api.getSubjects(),
        api.getGoals(),
        api.getActivities(),
      ]);
      setSubjects(subjData);
      setGoals(goalsData);
      setActivities(actsData);
    } catch (err) {
      console.error('Failed to load learning data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGoal = async (goalId, currentCompleted) => {
    try {
      const updated = await api.updateGoal(goalId, {
        is_completed: !currentCompleted,
        progress: !currentCompleted ? 100 : 50,
      });
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
      showNotification(
        !currentCompleted ? 'Goal marked completed! 🎉' : 'Goal status updated',
        'success'
      );
    } catch (err) {
      showNotification('Failed to update goal', 'error');
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      const created = await api.createGoal({
        title: newGoalTitle,
        category: newGoalCategory,
        target_date: newGoalDate,
        progress: 0,
      });
      setGoals((prev) => [created, ...prev]);
      setNewGoalTitle('');
      setShowGoalModal(false);
      showNotification('New learning goal established', 'success');
    } catch (err) {
      showNotification('Failed to create goal', 'error');
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Curriculum & Learning Goals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Track course syllabus modules, milestones, and personal study targets.
          </p>
        </div>

        <button
          onClick={() => setShowGoalModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Add Learning Goal
        </button>
      </div>

      {/* Goal Summary Statistics */}
      <div className="grid-3">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--primary-light)', borderRadius: '10px' }}>
              <Layers size={22} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {subjects.length} Subjects
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enrolled in {profile?.semester || '6th Semester'}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--success-light)', borderRadius: '10px' }}>
              <CheckCircle2 size={22} color="var(--success)" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {goals.filter((g) => g.is_completed).length} / {goals.length} Goals
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Completed milestones
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--accent-purple-light)', borderRadius: '10px' }}>
              <Award size={22} color="var(--accent-purple)" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {profile?.current_skill_level || 'Intermediate'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Current Learner Assessment Tier
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Learning Goals & Enrolled Subjects */}
      <div className="grid-2">
        {/* Goals Column */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Target size={18} color="var(--primary)" />
                Active Learning Goals
              </div>
              <div className="card-desc">Personalized milestones tracking competency</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {goals.map((g) => (
              <div
                key={g.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  opacity: g.is_completed ? 0.75 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <input
                      type="checkbox"
                      checked={g.is_completed}
                      onChange={() => handleToggleGoal(g.id, g.is_completed)}
                      style={{ marginTop: '0.25rem', cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          textDecoration: g.is_completed ? 'line-through' : 'none',
                        }}
                      >
                        {g.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {g.category} • Target: {g.target_date || 'Ongoing'}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${g.is_completed ? 'badge-success' : 'badge-primary'}`}>
                    {g.progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    backgroundColor: 'var(--border)',
                    borderRadius: '9999px',
                    marginTop: '0.75rem',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${g.progress}%`,
                      backgroundColor: g.is_completed ? 'var(--success)' : 'var(--primary)',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))}

            {goals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No goals created yet. Click "Add Learning Goal" above.
              </div>
            )}
          </div>
        </div>

        {/* Subjects Column */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BookOpen size={18} color="var(--primary)" />
                Syllabus & Core Courses ({subjects.length} Available)
              </div>
              <div className="card-desc">Academic courses configured from verified course materials</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {subjects.map((sub) => {
              const docCount = sub.documents?.length || (sub.document_filename ? 1 : 0);
              const docLabel =
                docCount > 1
                  ? `${docCount} Materials (${sub.documents.map((d) => d.filename).join(', ')})`
                  : sub.document_filename || sub.documents?.[0]?.filename || 'PDF';

              return (
              <div
                key={sub.id}
                style={{
                  padding: '1.15rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-primary">{sub.code}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {sub.name}
                    </span>
                  </div>
                  <span className={`badge ${sub.num_chunks > 0 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.725rem' }}>
                    ● {sub.num_chunks || 0} Chunks Indexed
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={docLabel}>
                    <FileText size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Material: <strong>{docLabel}</strong>
                    </span>
                  </div>
                  <span>{sub.credits} Credits • {sub.semester}</span>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {sub.description}
                </div>

                {sub.topics && sub.topics.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                      Extracted Syllabus Topics:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {sub.topics.map((top, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                          }}
                        >
                          {top}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button
                    onClick={() => navigate(`/assistant?subject=${sub.id}`)}
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    <Sparkles size={13} />
                    Ask AI Tutor
                  </button>
                  <button
                    onClick={() => navigate(`/quiz?subject=${sub.id}`)}
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    <GraduationCap size={13} />
                    Take Quiz
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Clock size={18} color="var(--primary)" />
              Complete Learning Activity Log
            </div>
            <div className="card-desc">Chronological trace of student interactions and accomplishments</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activities.map((act) => (
            <div
              key={act.id}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {act.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {act.description}
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                {new Date(act.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {activities.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No activities logged yet.
            </div>
          )}
        </div>
      </div>

      {/* Add Goal Modal */}
      {showGoalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div className="card-header">
              <div className="card-title">Set New Learning Goal</div>
            </div>

            <form onSubmit={handleCreateGoal}>
              <div className="input-group">
                <label className="input-label">Goal Title / Objective</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Master Convolutional Neural Networks for image classification"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Subject / Category</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Deep Learning, Database Systems"
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Target Completion Date</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Nov 15, 2026"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
