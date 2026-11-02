import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Bell,
  Send,
  Users,
  User,
  AlertTriangle,
  Info,
  Calendar,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Search,
  Check,
  Shield,
  Sparkles,
} from 'lucide-react';
import { api, isAdminDemoMode, setAdminDemoMode } from '../../services/api';

export default function AdminAlerts() {
  const outletCtx = useOutletContext();
  const showToast = outletCtx?.showToast || ((msg) => console.log(msg));

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('info');
  const [scope, setScope] = useState('all'); // 'all' | 'selected' | 'individual'
  const [submitting, setSubmitting] = useState(false);

  // Student selection state for 'selected' or 'individual'
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.getAdminAlertsHistory(30);
      setHistory(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to load alert history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      setStudentsLoading(true);
      const res = await api.getAdminUsers({ page: 1, page_size: 100 });
      setAllStudents(res.items || []);
    } catch (err) {
      console.error('Failed to load students for selection', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    loadStudents();
  }, []);

  const handleToggleSelectStudent = (id) => {
    if (scope === 'individual') {
      setSelectedStudentIds([id]);
    } else {
      if (selectedStudentIds.includes(id)) {
        setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
      } else {
        setSelectedStudentIds([...selectedStudentIds, id]);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === allStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(allStudents.map((s) => s.id));
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please provide both an announcement title and message content.', 'error');
      return;
    }
    if ((scope === 'selected' || scope === 'individual') && selectedStudentIds.length === 0) {
      showToast('Please select at least one student recipient.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        message: message.trim(),
        category,
        scope,
        target_user_ids: scope === 'all' ? [] : selectedStudentIds,
      };

      const res = await api.broadcastAdminAlert(payload);
      const countDelivered = res.delivered_count ?? res.recipients_count ?? 0;
      showToast(
        `Announcement broadcast successfully! Delivered to ${countDelivered} student(s).`,
        'success'
      );

      // Reset form
      setTitle('');
      setMessage('');
      setCategory('info');
      setScope('all');
      setSelectedStudentIds([]);

      // Refresh sent history
      loadHistory();
    } catch (err) {
      showToast(err.message || 'Failed to broadcast alert', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Alerts & Announcements Composer
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Dispatch real-time institutional notifications and urgent warnings to enrolled students across the platform.
          </p>
        </div>
        <button
          onClick={loadHistory}
          disabled={historyLoading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={historyLoading ? 'spin' : ''} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Left: Composer Form */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <Send size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Compose Announcement
            </h3>
          </div>

          <form onSubmit={handleBroadcast}>
            {/* Target Scope */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Target Audience Scope
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: scope === 'all' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: scope === 'all' ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
                    color: scope === 'all' ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Users size={18} />
                  <span>All Students</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: scope === 'selected' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: scope === 'selected' ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
                    color: scope === 'selected' ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Users size={18} />
                  <span>Selected Group</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('individual')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: scope === 'individual' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: scope === 'individual' ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
                    color: scope === 'individual' ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <User size={18} />
                  <span>Individual</span>
                </button>
              </div>
            </div>

            {/* Student Picker if selected or individual */}
            {(scope === 'selected' || scope === 'individual') && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {scope === 'selected'
                      ? `Select Recipients (${selectedStudentIds.length} selected)`
                      : 'Choose Student'}
                  </span>
                  {scope === 'selected' && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {selectedStudentIds.length === allStudents.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search by name or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ paddingLeft: '2rem', fontSize: '0.8rem', width: '100%' }}
                  />
                </div>

                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {filteredStudents.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleSelectStudent(s.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.15)' : 'var(--bg-surface)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{s.email}</span>
                        </div>
                        {isSelected && <Check size={14} color="var(--primary)" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Category & Urgency
              </label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="info">General Information</option>
                <option value="warning">Important Alert / Warning</option>
                <option value="deadline">Academic Deadline & Quiz Reminder</option>
                <option value="quota_alert">Storage Quota Policy Notice</option>
                <option value="system_notice">Scheduled System Maintenance</option>
              </select>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Announcement Title
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. End of Semester Exam Preparation & Quiz Review Available"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            {/* Message Body */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Message Content
              </label>
              <textarea
                className="input-field"
                rows={5}
                placeholder="Provide detailed instructions, course references, or guidelines for students..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Send size={18} />
              <span>{submitting ? 'Broadcasting...' : 'Broadcast Alert Now'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Card Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <Bell size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Live Student Portal Preview
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              This is how your alert will render inside the student's notification center and dashboard alert feed:
            </p>

            {/* Rendered Notification Card Mockup */}
            <div
              style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1.25rem',
                borderLeft: `4px solid ${
                  category === 'warning'
                    ? '#ef4444'
                    : category === 'deadline'
                    ? '#f59e0b'
                    : category === 'quota_alert'
                    ? '#dc2626'
                    : 'var(--primary)'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color:
                      category === 'warning'
                        ? '#ef4444'
                        : category === 'deadline'
                        ? '#f59e0b'
                        : 'var(--primary)',
                  }}
                >
                  {category.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Just now</span>
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {title.trim() || 'Announcement Title'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {message.trim() || 'Notification body text will appear here once entered...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Broadcast History
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Log of recent institutional broadcasts and announcements sent to students.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {history.length} dispatched announcements
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Timestamp</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Announcement Title</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Audience Scope</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Delivered</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading && history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading broadcast history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>No announcements dispatched yet.</p>
                      {!isAdminDemoMode() && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdminDemoMode(true);
                            window.location.reload();
                          }}
                          className="btn btn-sm btn-outline"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            color: '#d97706',
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <Sparkles size={14} color="#d97706" />
                          <span>View Sample Broadcast History in Demo Mode</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-main)',
                          border: '1px solid var(--border)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.category || 'Info'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.title}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {item.scope === 'all' ? 'All Active Students' : item.scope}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                      {item.delivered_count || 1} students
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
