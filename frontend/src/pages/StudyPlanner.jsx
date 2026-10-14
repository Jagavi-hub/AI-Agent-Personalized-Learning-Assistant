import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Sparkles,
  Layers,
  Award,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function StudyPlanner() {
  const { profile, showNotification } = useStudent();
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate Plan modal / form state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [planTitle, setPlanTitle] = useState('Midterm Sprint: Deep Learning & DBMS');
  const [selectedSubject, setSelectedSubject] = useState('Deep Learning & Neural Networks');
  const [targetDate, setTargetDate] = useState('Oct 28, 2026');
  const [availableHours, setAvailableHours] = useState(14);
  const [generating, setGenerating] = useState(false);

  // New manual task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTopic, setTaskTopic] = useState('Backpropagation');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDay, setTaskDay] = useState('Day 1 (Mon)');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskPriority, setTaskPriority] = useState('High');

  useEffect(() => {
    loadStudyPlans();
  }, []);

  const loadStudyPlans = async () => {
    try {
      setLoading(true);
      const data = await api.getStudyPlans();
      setPlans(data);
      if (data.length > 0) {
        setActivePlan(data[0]);
      }
    } catch (err) {
      console.error('Failed to load study plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const generated = await api.generateStudyPlan({
        title: planTitle,
        subject: selectedSubject,
        target_date: targetDate,
        available_hours_per_week: parseInt(availableHours),
        focus_weak_topics: true,
      });
      setPlans((prev) => [generated, ...prev]);
      setActivePlan(generated);
      setShowGenerateModal(false);
      showNotification(`Generated 7-day plan '${generated.title}' targeting active weak topics!`, 'success');
    } catch (err) {
      showNotification('Failed to generate study plan.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    try {
      const updated = await api.updateStudyTask(taskId, { is_completed: !currentCompleted });
      if (activePlan) {
        setActivePlan({
          ...activePlan,
          tasks: activePlan.tasks.map((t) => (t.id === taskId ? updated : t)),
        });
      }
      showNotification(!currentCompleted ? 'Task completed! Keep up the momentum.' : 'Task marked pending', 'success');
    } catch (err) {
      showNotification('Failed to update task status.', 'error');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!activePlan || !taskDesc.trim()) return;

    try {
      const created = await api.createStudyTask({
        plan_id: activePlan.id,
        topic: taskTopic,
        task_description: taskDesc,
        day_of_week: taskDay,
        estimated_minutes: parseInt(taskMinutes),
        priority: taskPriority,
      });
      setActivePlan({
        ...activePlan,
        tasks: [...activePlan.tasks, created],
      });
      setTaskDesc('');
      setShowTaskModal(false);
      showNotification('New study task added.', 'success');
    } catch (err) {
      showNotification('Failed to add study task.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteStudyTask(taskId);
      if (activePlan) {
        setActivePlan({
          ...activePlan,
          tasks: activePlan.tasks.filter((t) => t.id !== taskId),
        });
      }
      showNotification('Task deleted.', 'info');
    } catch (err) {
      showNotification('Failed to delete task.', 'error');
    }
  };

  // Compute completion stats
  const totalTasks = activePlan?.tasks?.length || 0;
  const completedTasks = activePlan?.tasks?.filter((t) => t.is_completed).length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Personalized Study Planner</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Structured, milestone-based academic schedules adapted to diagnostic test performance and exam deadlines.
          </p>
        </div>

        <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary">
          <Sparkles size={16} /> Generate New Study Plan
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid-3">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--primary-light)', borderRadius: '10px' }}>
              <Calendar size={22} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {activePlan?.target_date || 'Ongoing'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Target Examination / Milestone
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
                {completedTasks} / {totalTasks} Tasks
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {completionPercentage}% of Plan Completed
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--accent-purple-light)', borderRadius: '10px' }}>
              <Clock size={22} color="var(--accent-purple)" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {activePlan?.available_hours_per_week || 14} Hours / Wk
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Allocated Independent Study Time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Study Plan Card */}
      {activePlan ? (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="badge badge-primary">{activePlan.subject}</span>
                <span className="card-title" style={{ fontSize: '1.2rem' }}>{activePlan.title}</span>
              </div>
              <div className="card-desc">
                7-day structured revision schedule dynamically prioritizing flagged weak topics
              </div>
            </div>

            <button onClick={() => setShowTaskModal(true)} className="btn btn-secondary btn-sm">
              <Plus size={14} /> Add Manual Task
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Plan Progression</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{completionPercentage}%</span>
            </div>
            <div
              style={{
                height: '8px',
                width: '100%',
                backgroundColor: 'var(--border)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${completionPercentage}%`,
                  backgroundColor: 'var(--primary)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activePlan.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: task.is_completed ? 'var(--bg-surface)' : 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  opacity: task.is_completed ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleToggleTask(task.id, task.is_completed)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: task.is_completed ? 'var(--success)' : 'var(--text-light)',
                      marginTop: '2px',
                    }}
                    title={task.is_completed ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {task.is_completed ? <CheckSquare size={20} color="var(--success)" /> : <Square size={20} />}
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-neutral">{task.day_of_week}</span>
                      <span className="badge badge-primary">{task.topic}</span>
                      <span className={`badge ${task.priority === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                        {task.priority} Priority
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ⏱ {task.estimated_minutes} mins
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-main)',
                        textDecoration: task.is_completed ? 'line-through' : 'none',
                        lineHeight: 1.5,
                      }}
                    >
                      {task.task_description}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-light)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Remove task"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {activePlan.tasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No tasks added to this plan yet. Click "Add Manual Task" above.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Calendar size={40} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No Active Study Plan Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Generate a personalized 7-day study plan aligned with your enrolled courses and weak-topic quiz records.
          </p>
          <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary">
            <Sparkles size={16} /> Generate Personalized Plan
          </button>
        </div>
      )}

      {/* Generate Plan Modal */}
      {showGenerateModal && (
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
          <div className="card" style={{ maxWidth: '520px', width: '100%', backgroundColor: 'var(--bg-surface)' }}>
            <div className="card-header">
              <div className="card-title">
                <Sparkles size={18} color="var(--primary)" /> Generate Study Plan
              </div>
            </div>

            <form onSubmit={handleGeneratePlan}>
              <div className="input-group">
                <label className="input-label">Plan Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Academic Subject</label>
                <select
                  className="input-field"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="Deep Learning & Neural Networks">Deep Learning & Neural Networks</option>
                  <option value="Database Management Systems">Database Management Systems</option>
                  <option value="Design & Analysis of Algorithms">Design & Analysis of Algorithms</option>
                  <option value="Operating Systems Principles">Operating Systems Principles</option>
                </select>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Target Examination Date</label>
                  <input
                    type="text"
                    className="input-field"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Available Hours / Week</label>
                  <input
                    type="number"
                    min={4}
                    max={50}
                    className="input-field"
                    value={availableHours}
                    onChange={(e) => setAvailableHours(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--primary-light)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--primary)',
                  marginBottom: '1.25rem',
                }}
              >
                💡 <strong>Adaptive Planning:</strong> The AI planner automatically examines your recent quiz evaluations and allocates dedicated revision sprints to identified weak areas.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowGenerateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={generating} className="btn btn-primary">
                  {generating ? 'Synthesizing Plan...' : 'Generate 7-Day Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
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
          <div className="card" style={{ maxWidth: '480px', width: '100%', backgroundColor: 'var(--bg-surface)' }}>
            <div className="card-header">
              <div className="card-title">Add Custom Study Task</div>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="input-group">
                <label className="input-label">Topic / Concept</label>
                <input
                  type="text"
                  className="input-field"
                  value={taskTopic}
                  onChange={(e) => setTaskTopic(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Task Description</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="e.g. Read lecture slides page 4-12 and solve 2 numerical derivatives..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  required
                />
              </div>

              <div className="grid-3">
                <div className="input-group">
                  <label className="input-label">Day</label>
                  <select className="input-field" value={taskDay} onChange={(e) => setTaskDay(e.target.value)}>
                    <option value="Day 1 (Mon)">Day 1</option>
                    <option value="Day 2 (Tue)">Day 2</option>
                    <option value="Day 3 (Wed)">Day 3</option>
                    <option value="Day 4 (Thu)">Day 4</option>
                    <option value="Day 5 (Fri)">Day 5</option>
                    <option value="Day 6 (Sat)">Day 6</option>
                    <option value="Day 7 (Sun)">Day 7</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Duration (Mins)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={taskMinutes}
                    onChange={(e) => setTaskMinutes(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Priority</label>
                  <select className="input-field" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
