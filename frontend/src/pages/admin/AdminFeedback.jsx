import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Send,
  Star,
  User,
  Shield,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api, isAdminDemoMode, setAdminDemoMode } from '../../services/api';

export default function AdminFeedback() {
  const outletCtx = useOutletContext();
  const showToast = outletCtx?.showToast || ((msg) => console.log(msg));

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'open' | 'awaiting_student' | 'resolved'
  const [search, setSearch] = useState('');

  // Selected Thread State
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminFeedback(filter !== 'all' ? filter : null);
      setFeedbacks(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to load feedback tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [filter]);

  const handleOpenThread = async (fb) => {
    try {
      const threadRes = await api.getAdminFeedbackThread(fb.id);
      setSelectedThread(threadRes);
      setReplyMessage('');
      setThreadModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to load feedback thread', 'error');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedThread) return;

    try {
      setReplySubmitting(true);
      await api.replyToFeedbackAdmin(selectedThread.id, replyMessage.trim());
      showToast('Faculty reply dispatched to student', 'success');
      setReplyMessage('');

      // Refresh thread
      const updated = await api.getAdminFeedbackThread(selectedThread.id);
      setSelectedThread(updated);
      loadFeedbacks();
    } catch (err) {
      showToast(err.message || 'Failed to post reply', 'error');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedThread) return;
    try {
      setStatusUpdating(true);
      await api.updateFeedbackStatus(selectedThread.id, newStatus);
      showToast(`Ticket status updated to ${newStatus.replace('_', ' ').toUpperCase()}`, 'success');

      setSelectedThread((prev) => ({ ...prev, status: newStatus }));
      loadFeedbacks();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

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

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (fb.student_name && fb.student_name.toLowerCase().includes(q)) ||
      (fb.student_email && fb.student_email.toLowerCase().includes(q)) ||
      ((fb.message || fb.comment) && (fb.message || fb.comment).toLowerCase().includes(q)) ||
      (fb.category && fb.category.toLowerCase().includes(q))
    );
  });

  const totalCount = feedbacks.length;
  const openCount = feedbacks.filter((f) => f.status === 'open').length;
  const awaitingCount = feedbacks.filter((f) => f.status === 'awaiting_student').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'resolved').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Student Support & Feedback Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Engage with student inquiries, review course ratings, and conduct multi-turn support threads.
          </p>
        </div>
        <button
          onClick={loadFeedbacks}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Tickets</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>{totalCount}</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>Open Tickets</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{openCount}</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>Awaiting Student</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{awaitingCount}</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>Resolved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search feedback by student name, message, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem', width: '100%' }}
          />
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-main)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          {['all', 'open', 'awaiting_student', 'resolved'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                background: filter === tab ? 'var(--bg-surface)' : 'transparent',
                border: filter === tab ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: filter === tab ? 700 : 500,
                color: filter === tab ? 'var(--text-main)' : 'var(--text-muted)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Student</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rating</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Message Excerpt</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && feedbacks.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading feedback tickets...
                  </td>
                </tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>No feedback tickets found matching your filter.</p>
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
                          <span>View Sample Multi-Turn Feedback Threads in Demo Mode</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((fb) => (
                  <tr key={fb.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{fb.student_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fb.student_email}</div>
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
                        {fb.category || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            fill={star <= (fb.rating || 5) ? '#f59e0b' : 'none'}
                            color={star <= (fb.rating || 5) ? '#f59e0b' : 'var(--text-muted)'}
                          />
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                      {fb.message || fb.comment}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          backgroundColor:
                            fb.status === 'open'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : fb.status === 'awaiting_student'
                              ? 'rgba(79, 70, 229, 0.15)'
                              : 'rgba(34, 197, 94, 0.15)',
                          color:
                            fb.status === 'open'
                              ? '#d97706'
                              : fb.status === 'awaiting_student'
                              ? 'var(--primary)'
                              : '#16a34a',
                          border: `1px solid ${
                            fb.status === 'open'
                              ? 'rgba(245, 158, 11, 0.3)'
                              : fb.status === 'awaiting_student'
                              ? 'rgba(79, 70, 229, 0.3)'
                              : 'rgba(34, 197, 94, 0.3)'
                          }`,
                        }}
                      >
                        {(fb.status || 'open').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenThread(fb)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <MessageSquare size={14} />
                        <span>View Thread</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thread & Reply Modal */}
      {threadModalOpen && selectedThread && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '650px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
            }}
          >
            {/* Thread Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Support Ticket #{selectedThread.id}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Student: {selectedThread.student_name} ({selectedThread.student_email})
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select
                  value={selectedThread.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusUpdating}
                  className="input-field"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <option value="open">Status: Open</option>
                  <option value="awaiting_student">Status: Awaiting Student</option>
                  <option value="resolved">Status: Resolved</option>
                </select>

                <button
                  onClick={() => setThreadModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conversation Messages Stream */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                paddingRight: '0.5rem',
                marginBottom: '1.25rem',
              }}
            >
              {/* Initial Student Post */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {selectedThread.student_name ? selectedThread.student_name[0] : 'S'}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {selectedThread.student_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(selectedThread.created_at)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {selectedThread.message || selectedThread.comment}
                </p>
              </div>

              {/* Multi-turn replies */}
              {selectedThread.replies && selectedThread.replies.map((reply, i) => {
                const isAdmin = reply.is_admin || reply.role === 'admin';
                return (
                  <div
                    key={reply.id || i}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      backgroundColor: isAdmin ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-main)',
                      border: isAdmin ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid var(--border)',
                      marginLeft: isAdmin ? '1.5rem' : '0',
                      marginRight: !isAdmin ? '1.5rem' : '0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isAdmin ? (
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Shield size={14} />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            S
                          </div>
                        )}
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {isAdmin ? (reply.author_name || 'Faculty Administrator') : (reply.author_name || selectedThread.student_name)}
                        </span>
                        {isAdmin && (
                          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                            STAFF
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(reply.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {reply.message}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSendReply} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Type an official faculty response to this student..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Student will receive an in-app notification when you reply.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setThreadModalOpen(false)}
                    className="btn btn-secondary"
                    disabled={replySubmitting}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={replySubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Send size={15} />
                    <span>{replySubmitting ? 'Posting...' : 'Send Reply'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
