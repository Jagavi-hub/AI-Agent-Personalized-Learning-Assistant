import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  User,
  Star,
  RefreshCw,
  X,
  RotateCcw,
  BookOpen,
  Filter,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

const CATEGORIES = [
  'General Feedback',
  'Bug Report',
  'AI Tutor/RAG Issue',
  'Quiz Issue',
  'Upload/Storage Issue',
  'Account/Login Issue',
  'Other',
];

const PRIORITIES = [
  { value: 'Low', label: 'Low', desc: 'General suggestion or low-impact inquiry' },
  { value: 'Normal', label: 'Normal', desc: 'Standard question or minor issue' },
  { value: 'High', label: 'High', desc: 'Urgent problem blocking study or access' },
];

export default function FeedbackSupport() {
  const { profile, showNotification } = useStudent();

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General Feedback');
  const [priority, setPriority] = useState('Normal');
  const [relatedCourse, setRelatedCourse] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // History State
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [coursesList, setCoursesList] = useState([]);

  // Conversation Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // Load history and courses on mount
  useEffect(() => {
    loadFeedbackHistory();
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await api.getCourses();
      setCoursesList(res || []);
    } catch {
      // Non-fatal, course select is optional
    }
  };

  const loadFeedbackHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getFeedback();
      setFeedbacks(res || []);
    } catch (err) {
      if (showNotification) {
        showNotification(err.message || 'Failed to load feedback history', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (subject.trim().length < 3) {
      setSubmitError('Subject must be at least 3 characters long.');
      return;
    }

    if (comment.trim().length < 10) {
      setSubmitError('Message must be at least 10 characters long to provide sufficient detail.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        subject: subject.trim(),
        category,
        priority,
        related_course: relatedCourse.trim() || null,
        rating: Number(rating) || 5,
        comment: comment.trim(),
      };

      const res = await api.submitFeedback(payload);
      setSubmitSuccess(true);
      setSubject('');
      setCategory('General Feedback');
      setPriority('Normal');
      setRelatedCourse('');
      setRating(5);
      setComment('');

      if (showNotification) {
        showNotification('Support ticket submitted successfully.', 'success');
      }

      await loadFeedbackHistory();

      // Open the newly created ticket modal immediately
      if (res?.id) {
        handleOpenConversation(res.id);
      }
    } catch (err) {
      const msg = err.message || 'Failed to submit feedback. Please try again.';
      setSubmitError(msg);
      if (showNotification) {
        showNotification(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenConversation = async (ticketId) => {
    try {
      setReplyError(null);
      setReplyMessage('');
      const thread = await api.getFeedbackThread(ticketId);
      setSelectedTicket(thread);
      setModalOpen(true);
    } catch (err) {
      if (showNotification) {
        showNotification(err.message || 'Failed to load conversation thread', 'error');
      }
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    setReplyError(null);

    try {
      setReplySubmitting(true);
      await api.replyToFeedback(selectedTicket.id, replyMessage.trim());
      setReplyMessage('');

      // Refresh thread
      const updated = await api.getFeedbackThread(selectedTicket.id);
      setSelectedTicket(updated);
      await loadFeedbackHistory();

      if (showNotification) {
        showNotification('Reply sent to administrator.', 'success');
      }
    } catch (err) {
      const msg = err.message || 'Failed to send reply.';
      setReplyError(msg);
      if (showNotification) {
        showNotification(msg, 'error');
      }
    } finally {
      setReplySubmitting(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return { label: 'Resolved', bg: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: 'rgba(34, 197, 94, 0.3)' };
      case 'in_progress':
        return { label: 'In Progress', bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.3)' };
      case 'awaiting_student':
        return { label: 'Action Required', bg: 'rgba(217, 119, 6, 0.15)', color: '#d97706', border: 'rgba(217, 119, 6, 0.35)' };
      case 'awaiting_admin':
        return { label: 'Awaiting Staff', bg: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', border: 'rgba(2, 132, 199, 0.3)' };
      case 'reopened':
        return { label: 'Reopened', bg: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', border: 'rgba(234, 88, 12, 0.3)' };
      default:
        return { label: 'Open', bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' };
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'High':
        return { label: 'High Priority', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'Low':
        return { label: 'Low', color: 'var(--text-muted)', bg: 'var(--bg-surface-hover)' };
      default:
        return { label: 'Normal', color: 'var(--primary)', bg: 'rgba(79, 70, 229, 0.1)' };
    }
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return fb.status !== 'resolved';
    return fb.status === statusFilter;
  });

  const openTicketsCount = feedbacks.filter((fb) => fb.status !== 'resolved').length;
  const resolvedTicketsCount = feedbacks.filter((fb) => fb.status === 'resolved').length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(79, 70, 229, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={20} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Feedback & Academic Support
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Submit questions, report system issues, or share ideas directly with university faculty and platform administrators.
          </p>
        </div>

        {/* Status Counter Badges */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
            }}
          >
            <Clock size={15} color="#2563eb" />
            <span style={{ color: 'var(--text-muted)' }}>Active Tickets:</span>
            <strong style={{ color: 'var(--text-main)' }}>{openTicketsCount}</strong>
          </div>

          <div
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
            }}
          >
            <CheckCircle2 size={15} color="#16a34a" />
            <span style={{ color: 'var(--text-muted)' }}>Resolved:</span>
            <strong style={{ color: 'var(--text-main)' }}>{resolvedTicketsCount}</strong>
          </div>
        </div>
      </div>

      {/* 1. SUBMIT FEEDBACK CARD */}
      <div
        className="card"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface-hover)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <PlusCircle size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
            Submit a New Support Ticket or Feedback
          </h2>
        </div>

        <div style={{ padding: '1.75rem' }}>
          {submitSuccess && (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#16a34a',
                fontSize: '0.875rem',
              }}
            >
              <CheckCircle2 size={20} />
              <div>
                <strong>Thank you!</strong> Your support ticket has been received and added to the administrative queue. An administrator will review and respond shortly.
              </div>
            </div>
          )}

          {submitError && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#ef4444',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={20} />
              <div>{submitError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Subject */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Subject / Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Difficulty understanding QuickSort algorithm notes in CS201"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: '100%' }}
                required
                maxLength={200}
              />
            </div>

            {/* Category & Priority Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Priority Level <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          flex: 1,
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                          backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                          color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.8rem',
                          padding: '0.45rem',
                        }}
                        title={p.desc}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Optional Related Course & Rating Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Related Course or Feature <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <select
                  className="input-field"
                  value={relatedCourse}
                  onChange={(e) => setRelatedCourse(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">General / None</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={`${c.code} - ${c.name}`}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                  <option value="AI Learning Assistant">AI Learning Assistant</option>
                  <option value="Quiz Practice Engine">Quiz Practice Engine</option>
                  <option value="Study Planner">Study Planner</option>
                  <option value="Knowledge Base / PDF Storage">Knowledge Base / PDF Storage</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Experience Rating <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingTop: '0.2rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '3px',
                      }}
                      title={`${star} Star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={22}
                        color={star <= rating ? '#eab308' : 'var(--text-muted)'}
                        fill={star <= rating ? '#eab308' : 'none'}
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    {rating === 5 ? '5/5 Excellent' : `${rating}/5 Stars`}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Message */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Detailed Message <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: comment.length > 2500 ? '#ef4444' : 'var(--text-muted)' }}>
                  {comment.length} / 3000 chars
                </span>
              </div>
              <textarea
                className="input-field"
                rows={5}
                placeholder="Describe your question, observation, or problem in detail. If reporting a bug, describe what happened and the steps to reproduce..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
                required
                maxLength={3000}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. STUDENT FEEDBACK HISTORY */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>
              My Support History & Conversations
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Track previous questions, read administrator responses, and reply to open conversations.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Tickets' },
              { id: 'active', label: 'Active' },
              { id: 'awaiting_student', label: 'Awaiting You' },
              { id: 'resolved', label: 'Resolved' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderColor: statusFilter === f.id ? 'var(--primary)' : 'var(--border)',
                  color: statusFilter === f.id ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: statusFilter === f.id ? 700 : 500,
                  backgroundColor: statusFilter === f.id ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                }}
              >
                {f.label}
              </button>
            ))}

            <button
              type="button"
              onClick={loadFeedbackHistory}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Refresh tickets"
              style={{ padding: '0.35rem 0.55rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tickets List */}
        {loading && feedbacks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
            <div>Loading your feedback history...</div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
            }}
          >
            <MessageSquare size={36} style={{ opacity: 0.35, margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              No support tickets found
            </h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {statusFilter !== 'all'
                ? `You have no tickets matching the filter "${statusFilter}".`
                : 'You have not submitted any feedback or support requests yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredFeedbacks.map((fb) => {
              const statusBadge = getStatusBadge(fb.status);
              const priorityBadge = getPriorityBadge(fb.priority);
              const repliesCount = fb.replies_count || 0;

              return (
                <div
                  key={fb.id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        #{fb.id}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        {fb.subject}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: priorityBadge.bg,
                          color: priorityBadge.color,
                          fontWeight: 600,
                        }}
                      >
                        {priorityBadge.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-surface-hover)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {fb.category}
                      </span>
                      {fb.related_course && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(79, 70, 229, 0.08)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <BookOpen size={10} />
                          {fb.related_course}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                          fontWeight: 700,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Comment Excerpt */}
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                    {fb.comment}
                  </div>

                  {/* Latest Reply Snippet */}
                  {fb.latest_reply ? (
                    <div
                      style={{
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: '6px',
                        padding: '0.65rem 0.85rem',
                        marginBottom: '0.85rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        borderLeft: '3px solid var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Shield size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong>Latest Response:</strong> {fb.latest_reply}
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                      ⏳ Awaiting university staff review...
                    </div>
                  )}

                  {/* Card Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div>
                      <span>Submitted {formatDate(fb.created_at)}</span>
                      {fb.updated_at && fb.updated_at !== fb.created_at && (
                        <span> • Updated {formatDate(fb.updated_at)}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenConversation(fb.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <MessageSquare size={13} color="var(--primary)" />
                      <span>View Conversation</span>
                      {repliesCount > 0 && (
                        <span
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            borderRadius: '9999px',
                            padding: '0.1rem 0.4rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {repliesCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. FULL CONVERSATION MODAL */}
      {modalOpen && selectedTicket && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              width: '92%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '88vh',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    #{selectedTicket.id}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedTicket.subject}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{selectedTicket.category}</span>
                  {selectedTicket.related_course && <span>• {selectedTicket.related_course}</span>}
                  <span>• Priority: {selectedTicket.priority || 'Normal'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {(() => {
                  const b = getStatusBadge(selectedTicket.status);
                  return (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        backgroundColor: b.bg,
                        color: b.color,
                        border: `1px solid ${b.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {b.label}
                    </span>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  title="Close dialog"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conversation Stream */}
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
              {/* Original Post */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
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
                      {profile?.name ? profile.name[0].toUpperCase() : 'S'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {profile?.name || 'You'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Author)</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatDate(selectedTicket.created_at)}
                      </div>
                    </div>
                  </div>

                  {selectedTicket.rating && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          color={s <= selectedTicket.rating ? '#eab308' : 'var(--text-muted)'}
                          fill={s <= selectedTicket.rating ? '#eab308' : 'none'}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {selectedTicket.comment}
                </div>
              </div>

              {/* Replies */}
              {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                selectedTicket.replies.map((reply) => {
                  const isAdmin = reply.sender_role === 'admin';
                  return (
                    <div
                      key={reply.id}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isAdmin ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-main)',
                        border: isAdmin ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid var(--border)',
                        marginLeft: isAdmin ? '1.5rem' : '0',
                        marginRight: isAdmin ? '0' : '1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: isAdmin ? '#4f46e5' : '#64748b',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            {isAdmin ? <Shield size={13} /> : <User size={13} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isAdmin ? '#4f46e5' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{reply.sender_name}</span>
                              {isAdmin && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: '#4f46e5',
                                    color: '#ffffff',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                  }}
                                >
                                  FACULTY / STAFF
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {formatDate(reply.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {reply.message}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No replies yet. Faculty administrators have been notified and will post here shortly.
                </div>
              )}
            </div>

            {/* Error Message in Modal */}
            {replyError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {replyError}
              </div>
            )}

            {/* Modal Action Area */}
            {selectedTicket.status === 'resolved' ? (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Ticket Resolved:</strong> An administrator has marked this inquiry as resolved.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Type your reply to university staff..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                    required
                    maxLength={3000}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="btn btn-secondary"
                      disabled={replySubmitting}
                    >
                      Close
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={replySubmitting || !replyMessage.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {replySubmitting ? (
                        <>
                          <RefreshCw size={14} className="spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
