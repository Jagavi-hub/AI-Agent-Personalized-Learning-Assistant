import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  HardDrive,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  FileText,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  Send,
  Download,
  Check,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function AdminConsole() {
  const { profile } = useStudent();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'warnings' | 'feedback' | 'audit'

  // Dashboard Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users State
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [usersLoading, setUsersLoading] = useState(false);

  // Selected User Storage Details Modal
  const [selectedUserStorage, setSelectedUserStorage] = useState(null);
  const [storageModalOpen, setStorageModalOpen] = useState(false);

  // Quota Edit Modal
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newQuotaMb, setNewQuotaMb] = useState(50);
  const [quotaSubmitting, setQuotaSubmitting] = useState(false);

  // Warnings & Cleanup State
  const [warnings, setWarnings] = useState([]);
  const [cleanupLogs, setCleanupLogs] = useState([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState(null);
  const [cleanupExecuting, setCleanupExecuting] = useState(false);
  const [cleanupTargetUser, setCleanupTargetUser] = useState(null);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('');
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // Notification Toast Message
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Dashboard Stats
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.getAdminDashboardStats();
      setStats(res);
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard metrics', 'danger');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Users
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const params = {
        page: userPage,
        page_size: 15,
        search: userSearch || undefined,
        warning_filter: userFilter !== 'all' ? userFilter : undefined,
      };
      const res = await api.getAdminUsers(params);
      setUsers(res.items || []);
      setUserTotal(res.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'danger');
    } finally {
      setUsersLoading(false);
    }
  };

  // Load Warnings and Cleanup logs
  const loadWarningsAndLogs = async () => {
    try {
      setWarningsLoading(true);
      const [warnRes, logsRes] = await Promise.all([
        api.getStorageWarnings('active'),
        api.getCleanupLogs(),
      ]);
      setWarnings(warnRes || []);
      setCleanupLogs(logsRes || []);
    } catch (err) {
      showToast(err.message || 'Failed to load warnings and cleanup history', 'danger');
    } finally {
      setWarningsLoading(false);
    }
  };

  // Load Feedback
  const loadFeedback = async () => {
    try {
      setFeedbacksLoading(true);
      const res = await api.getAdminFeedback(feedbackFilter || null);
      setFeedbacks(res || []);
    } catch (err) {
      showToast(err.message || 'Failed to load feedback', 'danger');
    } finally {
      setFeedbacksLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const params = {
        page: 1,
        page_size: 30,
        action: auditActionFilter || undefined,
      };
      const res = await api.getAuditLogs(params);
      setAuditLogs(res.items || []);
      setAuditTotal(res.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load audit logs', 'danger');
    } finally {
      setAuditLoading(false);
    }
  };

  // Initial and Tab-based data loading
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'warnings') loadWarningsAndLogs();
    if (activeTab === 'feedback') loadFeedback();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      const delay = setTimeout(loadUsers, 300);
      return () => clearTimeout(delay);
    }
  }, [userSearch, userFilter, userPage]);

  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedback();
    }
  }, [feedbackFilter]);

  // View User Storage Details
  const handleViewStorage = async (user) => {
    try {
      const data = await api.getAdminUserStorage(user.id);
      setSelectedUserStorage({ ...data, user });
      setStorageModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to load user storage breakdown', 'danger');
    }
  };

  // Open Quota Edit Modal
  const handleOpenQuotaModal = (user) => {
    setEditingUser(user);
    setNewQuotaMb(Math.round(user.quota_bytes / (1024 * 1024)));
    setQuotaModalOpen(true);
  };

  // Submit Quota Update
  const handleUpdateQuota = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setQuotaSubmitting(true);
      const res = await api.updateUserQuota(editingUser.id, Number(newQuotaMb));
      showToast(`Quota for ${editingUser.name} updated to ${res.quota_formatted}.`, 'success');
      setQuotaModalOpen(false);
      loadUsers();
      if (stats) loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to update quota', 'danger');
    } finally {
      setQuotaSubmitting(false);
    }
  };

  // Preview / Dry-Run Cleanup
  const handlePreviewCleanup = async (user) => {
    try {
      setCleanupTargetUser(user);
      const preview = await api.previewCleanup(user.id, 30);
      setCleanupPreview(preview);
      setCleanupModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to preview cleanup', 'danger');
    }
  };

  // Execute Cleanup
  const handleExecuteCleanup = async () => {
    if (!cleanupTargetUser) return;
    try {
      setCleanupExecuting(true);
      const result = await api.executeCleanup(cleanupTargetUser.id, 30);
      showToast(
        `Cleanup executed: Deleted ${result.files_deleted} expired files (${result.bytes_freed_formatted} freed).`,
        'success'
      );
      setCleanupModalOpen(false);
      loadWarningsAndLogs();
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Cleanup execution failed', 'danger');
    } finally {
      setCleanupExecuting(false);
    }
  };

  // View Feedback Thread
  const handleViewFeedbackThread = async (fbId) => {
    try {
      const thread = await api.getAdminFeedbackThread(fbId);
      setSelectedThread(thread);
      setReplyMessage('');
      setThreadModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to load feedback thread', 'danger');
    }
  };

  // Send Feedback Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedThread || !replyMessage.trim()) return;
    try {
      setReplySubmitting(true);
      const reply = await api.replyToFeedbackAdmin(selectedThread.id, replyMessage.trim());
      setSelectedThread((prev) => ({
        ...prev,
        status: 'awaiting_student',
        replies: [...prev.replies, reply],
      }));
      setReplyMessage('');
      showToast('Reply dispatched to student successfully.', 'success');
      loadFeedback();
    } catch (err) {
      showToast(err.message || 'Failed to send reply', 'danger');
    } finally {
      setReplySubmitting(false);
    }
  };

  // Change Feedback Status
  const handleStatusChange = async (newStatus) => {
    if (!selectedThread) return;
    try {
      await api.updateFeedbackStatus(selectedThread.id, newStatus);
      setSelectedThread((prev) => ({ ...prev, status: newStatus }));
      showToast(`Status updated to ${newStatus}.`, 'success');
      loadFeedback();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'danger');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Toast Banner */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: toast.type === 'danger' ? 'var(--danger)' : '#10b981',
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          {toast.type === 'danger' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '1.5rem 1.75rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Admin Console
              </h1>
              <span
                style={{
                  fontSize: '0.6875rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Production Staff
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Integrated User, Storage Quota, Multi-Turn Feedback & Audit System &bull; Signed in as{' '}
              <strong style={{ color: 'var(--text-main)' }}>{profile?.email}</strong>
            </div>
          </div>
        </div>

        {/* Global Refresh Button */}
        <button
          onClick={() => {
            if (activeTab === 'overview') loadStats();
            if (activeTab === 'users') loadUsers();
            if (activeTab === 'warnings') loadWarningsAndLogs();
            if (activeTab === 'feedback') loadFeedback();
            if (activeTab === 'audit') loadAuditLogs();
            showToast('Console data refreshed', 'success');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 0.95rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-main)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.25rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'users', label: 'Users & Storage', icon: Users, badge: userTotal },
          {
            id: 'warnings',
            label: 'Warnings & Retention',
            icon: AlertTriangle,
            badge: stats?.storage?.users_in_warning,
            badgeColor: 'var(--warning)',
          },
          {
            id: 'feedback',
            label: 'Feedback Center',
            icon: MessageSquare,
            badge: stats?.feedback?.open_feedback,
            badgeColor: 'var(--primary)',
          },
          { id: 'audit', label: 'Audit Log & Privacy', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : tab.badgeColor || 'var(--border)',
                    color: isActive ? '#ffffff' : '#ffffff',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Registered Users */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total Users</span>
                <Users size={18} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)' }}>
                {stats?.users?.total_registered ?? '--'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {stats?.users?.active_last_7d ?? 0} active in last 7 days
              </div>
            </div>

            {/* Storage Usage */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total User Disk Storage</span>
                <HardDrive size={18} color="#0284c7" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)' }}>
                {stats?.storage?.total_user_storage_formatted ?? '--'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Course materials excluded &bull; 50 MB standard quota
              </div>
            </div>

            {/* Quota Warnings */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Quota Warnings</span>
                <AlertTriangle size={18} color="var(--warning)" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)' }}>
                {stats?.storage?.users_in_warning ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.35rem', fontWeight: 600 }}>
                {stats?.storage?.users_over_quota ?? 0} users currently over 100% quota
              </div>
            </div>

            {/* Open Feedback */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Pending Feedback</span>
                <MessageSquare size={18} color="#7c3aed" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)' }}>
                {stats?.feedback?.open_feedback ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Avg Student Rating: {stats?.feedback?.average_rating?.toFixed(1) || '5.0'} ⭐
              </div>
            </div>
          </div>

          {/* Activity & System Status Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {/* Recent Administrative Events Feed */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                  <Activity size={18} color="var(--primary)" />
                  <span>Recent Administrative Events</span>
                </div>
                <button
                  onClick={() => setActiveTab('audit')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  View all <ChevronRight size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.recent_events?.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '1rem 0' }}>
                    No administrative events logged yet.
                  </div>
                ) : (
                  stats?.recent_events?.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {ev.action.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          by {ev.actor_email} &bull; Target: {ev.target_type} #{ev.target_id || ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Quota Policy Overview */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                Storage Policy & Retention Engine
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                LearnAI enforces rigorous disk storage management per student with automated 30-day retention policies:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>
                    <strong>50 MB Default Quota:</strong> Applies to personal student uploads.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>
                    <strong>Institutional Material Exclusion:</strong> Course syllabus PDFs never consume student quota.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--warning)" />
                  <span>
                    <strong>80% Threshold Warning:</strong> Dispatches persistent alert to guide student file management.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--danger)" />
                  <span>
                    <strong>100% Quota Exceeded:</strong> Rejects uploads and begins 30-day retention countdown.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="var(--primary)" />
                  <span>
                    <strong>Safe Cleanup:</strong> Deletes oldest student uploads only; never affects accounts, grades, or shared notes.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & STORAGE MANAGEMENT */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-surface-hover)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                flex: 1,
                minWidth: '240px',
              }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search students by name, email, or department..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  width: '100%',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Filter Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="var(--text-muted)" />
              <select
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setUserPage(1);
                }}
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Storage Statuses</option>
                <option value="normal">Normal (&lt; 80%)</option>
                <option value="warning">Warning (80% - 99%)</option>
                <option value="exceeded">Exceeded (100%+)</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1.25rem' }}>Student</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Disk Storage</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Allocation</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={20} className="spin-animation" style={{ margin: '0 auto 0.5rem' }} />
                        <div>Loading users and storage usage...</div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isOver = u.is_over_quota;
                      const isWarn = u.in_warning && !isOver;
                      let barCol = 'var(--primary)';
                      if (isOver) barCol = 'var(--danger)';
                      else if (isWarn) barCol = 'var(--warning)';

                      return (
                        <tr
                          key={u.id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Student Info */}
                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {u.email} &bull; {u.department || 'CSE'}
                            </div>
                          </td>

                          {/* Role */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '9999px',
                                backgroundColor: u.is_admin ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface-hover)',
                                color: u.is_admin ? '#d97706' : 'var(--text-muted)',
                              }}
                            >
                              {u.role ? u.role.toUpperCase() : u.is_admin ? 'ADMIN' : 'STUDENT'}
                            </span>
                          </td>

                          {/* Disk Storage Bar & Formatted Usage */}
                          <td style={{ padding: '0.85rem 1rem', minWidth: '180px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.used_formatted}</span>
                              <span style={{ fontWeight: 700, color: isOver ? 'var(--danger)' : isWarn ? 'var(--warning)' : 'var(--text-muted)' }}>
                                {u.used_percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: '6px',
                                backgroundColor: 'var(--bg-surface-hover)',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(u.used_percentage, 100)}%`,
                                  height: '100%',
                                  backgroundColor: barCol,
                                }}
                              />
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-light)', marginTop: '3px' }}>
                              {u.files_count} uploads
                            </div>
                          </td>

                          {/* Quota */}
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8125rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.quota_formatted}</div>
                            {u.custom_quota_bytes ? (
                              <span style={{ fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 600 }}>Custom Quota</span>
                            ) : (
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>Standard (50MB)</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {isOver ? (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  backgroundColor: 'var(--danger-light)',
                                  color: 'var(--danger)',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '9999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <AlertCircle size={11} /> Over Quota
                              </span>
                            ) : isWarn ? (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  backgroundColor: 'var(--warning-light)',
                                  color: '#b45309',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '9999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <AlertTriangle size={11} /> Warning
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  backgroundColor: 'var(--success-light)',
                                  color: 'var(--success)',
                                  fontWeight: 600,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '9999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <CheckCircle2 size={11} /> Normal
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                onClick={() => handleViewStorage(u)}
                                style={{
                                  background: 'var(--bg-surface-hover)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-main)',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Inspect uploaded documents"
                              >
                                <Eye size={13} /> Files
                              </button>

                              <button
                                onClick={() => handleOpenQuotaModal(u)}
                                style={{
                                  background: 'var(--primary-light)',
                                  border: '1px solid var(--primary-border)',
                                  color: 'var(--primary)',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Adjust student quota"
                              >
                                <Edit2 size={13} /> Quota
                              </button>

                              {isOver && (
                                <button
                                  onClick={() => handlePreviewCleanup(u)}
                                  style={{
                                    background: 'var(--danger-light)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: 'var(--danger)',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title="Deterministic cleanup dry-run"
                                >
                                  <Trash2 size={13} /> Cleanup
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Showing {users.length} of {userTotal} registered users</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    color: 'var(--text-main)',
                    cursor: userPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: userPage <= 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <button
                  disabled={userPage * 15 >= userTotal}
                  onClick={() => setUserPage((p) => p + 1)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    color: 'var(--text-main)',
                    cursor: userPage * 15 >= userTotal ? 'not-allowed' : 'pointer',
                    opacity: userPage * 15 >= userTotal ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STORAGE WARNINGS & RETENTION */}
      {activeTab === 'warnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Warnings Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                  Active Storage Warnings & 30-Day Retention Deadlines
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Persistent tracking for students at or above 80% quota with automated resolution deadlines
                </div>
              </div>
              <button
                onClick={loadWarningsAndLogs}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <RefreshCw size={15} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Warning Type</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Usage / Quota</th>
                    <th style={{ padding: '0.75rem 1rem' }}>30-Day Deadline</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Days Remaining</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Cleanup Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warningsLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading warning records...
                      </td>
                    </tr>
                  ) : warnings.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <CheckCircle2 size={24} color="var(--success)" style={{ margin: '0 auto 0.5rem' }} />
                        <div>No active storage warnings. All students are within safe storage allocations.</div>
                      </td>
                    </tr>
                  ) : (
                    warnings.map((w) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{w.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.student_email}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              backgroundColor: w.warning_type === 'quota_exceeded' ? 'var(--danger-light)' : 'var(--warning-light)',
                              color: w.warning_type === 'quota_exceeded' ? 'var(--danger)' : '#b45309',
                            }}
                          >
                            {w.warning_type === 'quota_exceeded' ? 'QUOTA EXCEEDED (100%+)' : 'WARNING THRESHOLD (80%+)'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{w.used_percentage.toFixed(1)}%</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {w.usage_bytes ? (w.usage_bytes / (1024 * 1024)).toFixed(1) : '0'} MB /{' '}
                            {w.quota_bytes ? (w.quota_bytes / (1024 * 1024)).toFixed(0) : '50'} MB
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                          {w.resolution_deadline ? new Date(w.resolution_deadline).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {w.days_remaining != null ? (
                            <span
                              style={{
                                fontWeight: 700,
                                color: w.days_remaining <= 5 ? 'var(--danger)' : 'var(--warning)',
                              }}
                            >
                              {w.days_remaining} days
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>--</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() =>
                              handlePreviewCleanup({
                                id: w.student_id,
                                name: w.student_name,
                                email: w.student_email,
                              })
                            }
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              backgroundColor: 'var(--danger-light)',
                              color: 'var(--danger)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Dry-Run Cleanup
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Cleanup Logs Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Historical Cleanup Audit Log
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Deterministic record of all automated and administrator-triggered document deletions
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '0.65rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Student ID</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Trigger</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Files Cleaned</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Space Freed</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanupLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No cleanup actions have been executed yet.
                      </td>
                    </tr>
                  ) : (
                    cleanupLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          {new Date(log.executed_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>#{log.student_id}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-surface-hover)',
                              fontWeight: 600,
                            }}
                          >
                            {log.trigger_reason}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{log.files_deleted_count} files</td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--success)', fontWeight: 700 }}>
                          {(log.bytes_freed / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {log.deleted_files_metadata ? (
                            <span title={log.deleted_files_metadata}>
                              {log.deleted_files_metadata.length > 50
                                ? `${log.deleted_files_metadata.slice(0, 50)}...`
                                : log.deleted_files_metadata}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FEEDBACK CENTER */}
      {activeTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Status Sub-Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: '', label: 'All Feedback' },
              { id: 'open', label: 'Open' },
              { id: 'awaiting_student', label: 'Awaiting Student' },
              { id: 'awaiting_admin', label: 'Awaiting Admin' },
              { id: 'resolved', label: 'Resolved' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFeedbackFilter(st.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: feedbackFilter === st.id ? 'var(--primary)' : 'var(--bg-surface)',
                  color: feedbackFilter === st.id ? '#ffffff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Feedback Threads List */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1.25rem' }}>Student</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Category & Rating</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Comment / Issue</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Replies</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacksLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading feedback items...
                      </td>
                    </tr>
                  ) : feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No feedback items in this view.
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map((fb) => (
                      <tr key={fb.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <div style={{ fontWeight: 600 }}>{fb.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fb.student_email}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{fb.category}</div>
                          <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                            {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)} ({fb.rating}/5)
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{fb.subject || 'Feedback'}</div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {fb.comment}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              backgroundColor:
                                fb.status === 'resolved'
                                  ? 'var(--success-light)'
                                  : fb.status === 'awaiting_admin'
                                  ? 'var(--danger-light)'
                                  : 'var(--primary-light)',
                              color:
                                fb.status === 'resolved'
                                  ? 'var(--success)'
                                  : fb.status === 'awaiting_admin'
                                  ? 'var(--danger)'
                                  : 'var(--primary)',
                            }}
                          >
                            {(fb.status || 'open').replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {fb.reply_count || 0} messages
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleViewFeedbackThread(fb.id)}
                            style={{
                              padding: '0.4rem 0.85rem',
                              borderRadius: '6px',
                              backgroundColor: 'var(--primary-light)',
                              color: 'var(--primary)',
                              border: '1px solid var(--primary-border)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <MessageSquare size={13} /> Open Thread
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG & PRIVACY */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Action Filter */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Showing {auditLogs.length} of {auditTotal} administrative audit events &bull; Passwords and credentials strictly redacted.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                }}
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Action Types</option>
                <option value="quota_update">Quota Updates</option>
                <option value="storage_cleanup">Storage Cleanups</option>
                <option value="admin_login">Admin Logins</option>
                <option value="feedback_reply">Feedback Replies</option>
                <option value="feedback_status_change">Status Changes</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface-hover)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Administrator</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Target</th>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Sanitized Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No audit events recorded for this selection.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{log.actor_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.actor_email}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-surface-hover)',
                              color: 'var(--text-main)',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem' }}>
                          {log.target_type} {log.target_id ? `(#${log.target_id})` : ''}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {log.details ? JSON.stringify(log.details) : '{}'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW STUDENT UPLOADED FILES */}
      {storageModalOpen && selectedUserStorage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {selectedUserStorage.user?.name}&apos;s Uploaded Documents
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Total Usage: {selectedUserStorage.used_formatted} of {selectedUserStorage.quota_formatted} (
                  {selectedUserStorage.used_percentage?.toFixed(1)}%)
                </div>
              </div>
              <button
                onClick={() => setStorageModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {selectedUserStorage.files?.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Student has not uploaded any personal documents yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {selectedUserStorage.files?.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-surface-hover)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <FileText size={18} color="var(--primary)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{file.filename}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {file.file_size_formatted} &bull; Uploaded on{' '}
                            {new Date(file.upload_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => api.downloadDocumentFile(file.id, file.filename)}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          color: 'var(--text-main)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Download size={13} /> Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setStorageModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE QUOTA */}
      {quotaModalOpen && editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.35rem' }}>
              Adjust Storage Quota
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Update storage allocation for <strong>{editingUser.name}</strong> ({editingUser.email})
            </div>

            <form onSubmit={handleUpdateQuota}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Custom Quota (in Megabytes):
                </label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="10"
                  value={newQuotaMb}
                  onChange={(e) => setNewQuotaMb(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    color: 'var(--text-main)',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Standard: 50 MB &bull; Minimum: 50 MB &bull; Maximum: 5,000 MB (5 GB)
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setQuotaModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quotaSubmitting}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--primary)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {quotaSubmitting ? 'Saving...' : 'Update Quota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLEANUP PREVIEW & EXECUTE */}
      {cleanupModalOpen && cleanupPreview && cleanupTargetUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginBottom: '0.35rem' }}>
              <AlertTriangle size={20} />
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Storage Cleanup Dry-Run Preview</div>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Target: <strong>{cleanupTargetUser.name}</strong> ({cleanupTargetUser.email})
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface-hover)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <strong>Current Usage:</strong> {cleanupPreview.current_used_formatted} of {cleanupPreview.quota_formatted} (
                {cleanupPreview.current_used_percentage.toFixed(1)}%)
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <strong>Estimated Cleanup Effect:</strong> Delete {cleanupPreview.eligible_files_count} files to free{' '}
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>{cleanupPreview.bytes_to_free_formatted}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Files queued for deletion (Oldest-first, user uploads only):
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '1.25rem' }}>
              {cleanupPreview.eligible_files?.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No files meet the deletion criteria or usage is already within quota.
                </div>
              ) : (
                cleanupPreview.eligible_files?.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      marginBottom: '0.35rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span>{f.filename}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{f.file_size_formatted}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setCleanupModalOpen(false)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
              {cleanupPreview.eligible_files_count > 0 && (
                <button
                  onClick={handleExecuteCleanup}
                  disabled={cleanupExecuting}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--danger)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {cleanupExecuting ? 'Executing...' : 'Execute Cleanup Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TWO-WAY FEEDBACK THREAD */}
      {threadModalOpen && selectedThread && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Thread Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {selectedThread.subject || `${selectedThread.category} Issue`}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  From <strong>{selectedThread.student_name}</strong> ({selectedThread.student_email}) &bull;{' '}
                  {'★'.repeat(selectedThread.rating)}
                </div>
              </div>

              {/* Status Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={selectedThread.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="open">Open</option>
                  <option value="awaiting_student">Awaiting Student</option>
                  <option value="awaiting_admin">Awaiting Admin</option>
                  <option value="resolved">Resolved</option>
                </select>

                <button
                  onClick={() => setThreadModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Conversation Flow */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Original Student Feedback Post */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--primary)' }}>
                    {selectedThread.student_name} (Student)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(selectedThread.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {selectedThread.comment}
                </div>
              </div>

              {/* Replies */}
              {selectedThread.replies?.map((r) => {
                const isAdmin = r.sender_role === 'admin';
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isAdmin ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                      border: `1px solid ${isAdmin ? 'var(--primary-border)' : 'var(--border)'}`,
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: isAdmin ? 'var(--primary)' : 'var(--text-main)',
                        }}
                      >
                        {r.sender_name} {isAdmin ? '(Admin Staff)' : '(Student)'}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                      {r.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            <form
              onSubmit={handleSendReply}
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '0.75rem',
              }}
            >
              <input
                type="text"
                placeholder="Write an administrative reply to the student..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.875rem',
                }}
                required
              />
              <button
                type="submit"
                disabled={replySubmitting}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Send size={14} />
                <span>{replySubmitting ? 'Sending...' : 'Reply'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
