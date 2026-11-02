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
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Curriculum & Learning Goals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, marginTop: '0.2rem' }}>
            Track course syllabus modules, milestones, and personal study targets.
          </p>
        </div>

        <button
          onClick={() => setShowGoalModal(true)}
          className="btn btn-primary"
          style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}
        >
          <Plus size={15} /> Add Learning Goal
        </button>
      </div>

      {/* Goal Summary Statistics */}
      <div className="grid-3" style={{ gap: '1rem' }}>
        <div className="card" style={{ padding: '0.9rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--primary-light)', borderRadius: '10px' }}>
              <Layers size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {subjects.length} Subjects
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Enrolled in {profile?.semester || '6th Semester'}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0.9rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--success-light)', borderRadius: '10px' }}>
              <CheckCircle2 size={20} color="var(--success)" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {goals.filter((g) => g.is_completed).length} / {goals.length} Goals
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Completed milestones
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0.9rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--accent-purple-light)', borderRadius: '10px' }}>
              <Award size={20} color="var(--accent-purple)" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {profile?.current_skill_level || 'Intermediate'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Current Learner Assessment Tier
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vertically Stacked Main Sections: 1. Syllabus & Core Courses (Top), 2. Active Learning Goals (Bottom) */}
      <div className="mylearning-stacked-container">
        {/* Section 1: Syllabus & Core Courses (7 Available) - FIRST, 100% Width */}
        <div className="card mylearning-section" style={{ padding: '1.25rem' }}>
          <div className="card-header" style={{ marginBottom: '1.15rem' }}>
            <div>
              <div className="card-title">
                <BookOpen size={18} color="var(--primary)" />
                Syllabus & Core Courses ({subjects.length} Available)
              </div>
              <div className="card-desc">Academic courses configured from verified course materials</div>
            </div>
          </div>

          <div className="mylearning-courses-grid">
            {subjects.map((sub) => {
              const docCount = sub.documents?.length || (sub.document_filename ? 1 : 0);
              const docLabel =
                docCount > 1
                  ? `${docCount} Materials (${sub.documents.map((d) => d.filename).join(', ')})`
                  : sub.document_filename || sub.documents?.[0]?.filename || 'PDF Document';

              return (
                <div key={sub.id} className="mylearning-course-card">
                  {/* 1. Course Header: Code, Chunks, and Title */}
                  <div style={{ marginBottom: '0.45rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.725rem', padding: '0.2rem 0.55rem', fontWeight: 600 }}>
                        {sub.code}
                      </span>
                      <span
                        className={`badge ${sub.num_chunks > 0 ? 'badge-success' : 'badge-warning'}`}
                        style={{ fontSize: '0.685rem', padding: '0.18rem 0.45rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        ● {sub.num_chunks || 0} Chunks Indexed
                      </span>
                    </div>
                    <h3
                      style={{
                        fontSize: '0.925rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        lineHeight: 1.35,
                        margin: 0,
                        minHeight: '2.5rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={sub.name}
                    >
                      {sub.name}
                    </h3>
                  </div>

                  {/* 2. Uploaded Material & Credits / Semester */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.45rem',
                      fontSize: '0.725rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.5rem',
                      paddingBottom: '0.45rem',
                      borderBottom: '1px solid var(--border)',
                      minHeight: '1.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        minWidth: 0,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={docLabel}
                    >
                      <FileText size={12} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Material: <strong>{docLabel}</strong>
                      </span>
                    </div>
                    <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {sub.credits} Credits • {sub.semester}
                    </span>
                  </div>

                  {/* 3. Course Description */}
                  <p
                    style={{
                      fontSize: '0.785rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.45,
                      margin: 0,
                      marginBottom: '0.55rem',
                      minHeight: '2.9em',
                      height: '2.9em',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    title={sub.description}
                  >
                    {sub.description || 'Academic curriculum materials and reference resources for this course.'}
                  </p>

                  {/* 4. Syllabus Topic Tags */}
                  <div
                    style={{
                      marginBottom: '0.5rem',
                      minHeight: '2.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.3rem',
                    }}
                  >
                    {sub.topics && sub.topics.length > 0 ? (
                      <>
                        {sub.topics.slice(0, 3).map((top, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.675rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-main)',
                              maxWidth: '160px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                            title={top}
                          >
                            {top}
                          </span>
                        ))}
                        {sub.topics.length > 3 && (
                          <span
                            style={{
                              fontSize: '0.675rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(37, 99, 235, 0.08)',
                              border: '1px solid rgba(37, 99, 235, 0.2)',
                              color: 'var(--primary)',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                            }}
                            title={sub.topics.slice(3).join(', ')}
                          >
                            +{sub.topics.length - 3} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.725rem',
                          color: 'var(--text-light)',
                          fontStyle: 'italic',
                          padding: '0.15rem 0',
                        }}
                      >
                        Syllabus topics indexing pending
                      </span>
                    )}
                  </div>

                  {/* 5. Action Buttons (Anchored to Bottom) */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '0.75rem',
                      display: 'flex',
                      gap: '0.5rem',
                    }}
                  >
                    <button
                      onClick={() => navigate(`/assistant?subject=${sub.id}`)}
                      className="btn btn-sm btn-primary"
                      style={{
                        flex: 1,
                        height: '34px',
                        padding: '0 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Sparkles size={12} />
                      Ask AI Tutor
                    </button>
                    <button
                      onClick={() => navigate(`/quiz?subject=${sub.id}`)}
                      className="btn btn-sm btn-secondary"
                      style={{
                        flex: 1,
                        height: '34px',
                        padding: '0 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <GraduationCap size={12} />
                      Take Quiz
                    </button>
                  </div>
                </div>
              );
            })}

            {subjects.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No courses found. Visit Knowledge Base to upload curriculum materials!
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Active Learning Goals - BELOW COURSES, 100% Width */}
        <div className="card mylearning-section" style={{ padding: '1.25rem' }}>
          <div className="card-header" style={{ marginBottom: '1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div className="card-title">
                <Target size={18} color="var(--primary)" />
                Active Learning Goals
              </div>
              <div className="card-desc">Personalized milestones tracking competency</div>
            </div>
            <button
              onClick={() => setShowGoalModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
            >
              <Plus size={14} /> Add Goal
            </button>
          </div>

          <div className="mylearning-goals-grid">
            {goals.map((g) => (
              <div
                key={g.id}
                className="mylearning-goal-card"
                style={{
                  opacity: g.is_completed ? 0.75 : 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={g.is_completed}
                        onChange={() => handleToggleGoal(g.id, g.is_completed)}
                        style={{ marginTop: '0.2rem', cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--primary)', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            lineHeight: 1.35,
                            textDecoration: g.is_completed ? 'line-through' : 'none',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {g.title}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {g.category} • Target: {g.target_date || 'Ongoing'}
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${g.is_completed ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', flexShrink: 0 }}>
                      {g.progress}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '5px',
                    width: '100%',
                    backgroundColor: 'var(--border)',
                    borderRadius: '9999px',
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
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No goals created yet. Click &quot;Add Goal&quot; above.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <div>
            <div className="card-title">
              <Clock size={18} color="var(--primary)" />
              Complete Learning Activity Log
            </div>
            <div className="card-desc">Chronological trace of student interactions and accomplishments</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activities.map((act) => (
            <div
              key={act.id}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {act.title}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {act.description}
                </div>
              </div>

              <span style={{ fontSize: '0.725rem', color: 'var(--text-light)', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
