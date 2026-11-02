import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  HardDrive,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Send,
  UserCheck,
  UserX,
  FileText,
  Calendar,
  Shield,
  RefreshCw,
  X,
  Trash2,
  Bell,
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const showToast = outletCtx?.showToast || ((msg) => console.log(msg));

  const [student, setStudent] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quota Modal
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [newQuotaMb, setNewQuotaMb] = useState(50);
  const [quotaSubmitting, setQuotaSubmitting] = useState(false);
  const [quotaError, setQuotaError] = useState(null);

  // Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState('suspend');
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Alert Modal
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCategory, setAlertCategory] = useState('info');
  const [alertLink, setAlertLink] = useState('/dashboard');
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertError, setAlertError] = useState(null);

  // Remove Modal
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeConfirmEmail, setRemoveConfirmEmail] = useState('');
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setQuotaModalOpen(false);
        setStatusModalOpen(false);
        setAlertModalOpen(false);
        setRemoveModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openQuotaModal = () => {
    const qBytes = student?.custom_quota_bytes || student?.storage?.quota_bytes || storageData?.quota_bytes || (50 * 1024 * 1024);
    setNewQuotaMb(Math.round(qBytes / (1024 * 1024)));
    setQuotaError(null);
    setQuotaModalOpen(true);
  };

  const openAlertModal = () => {
    setAlertTitle('');
    setAlertMessage('');
    setAlertCategory('info');
    setAlertLink('/dashboard');
    setAlertError(null);
    setAlertModalOpen(true);
  };

  const openStatusModal = (action) => {
    setStatusAction(action);
    setStatusReason('');
    setStatusError(null);
    setStatusModalOpen(true);
  };

  const openRemoveModal = () => {
    setRemoveConfirmEmail('');
    setRemoveError(null);
    setRemoveModalOpen(true);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [detailRes, storageRes] = await Promise.all([
        api.getAdminUserDetail(userId),
        api.getAdminUserStorage(userId).catch(() => null),
      ]);
      setStudent(detailRes);
      setStorageData(storageRes);
      if (detailRes.custom_quota_bytes) {
        setNewQuotaMb(Math.round(detailRes.custom_quota_bytes / (1024 * 1024)));
      }
    } catch (err) {
      setError(err.message || 'Failed to load student details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    setQuotaError(null);
    const parsedMb = parseInt(newQuotaMb, 10);
    if (isNaN(parsedMb) || parsedMb <= 0) {
      setQuotaError('Please enter a valid positive storage quota in megabytes.');
      return;
    }
    if (parsedMb > 50000) {
      setQuotaError('Storage quota exceeds the institutional safety limit of 50,000 MB (50 GB).');
      return;
    }

    try {
      setQuotaSubmitting(true);
      const res = await api.updateUserQuota(userId, parsedMb);
      const newBytes = parsedMb * 1024 * 1024;
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              custom_quota_bytes: res?.quota_bytes || newBytes,
              quota_bytes: res?.quota_bytes || newBytes,
              storage: res?.storage || (prev.storage ? { ...prev.storage, quota_bytes: newBytes } : prev.storage),
            }
          : prev
      );
      if (res?.storage) setStorageData(res.storage);
      window.dispatchEvent(new CustomEvent('learnai_storage_updated'));
      showToast(`Storage quota updated to ${parsedMb} MB for ${student?.name || 'student'}.`, 'success');
      setQuotaModalOpen(false);
      await loadData();
    } catch (err) {
      const msg = err.message || 'Failed to update quota';
      setQuotaError(msg);
      showToast(msg, 'error');
    } finally {
      setQuotaSubmitting(false);
    }
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    setStatusError(null);
    try {
      setStatusSubmitting(true);
      const newStatus = statusAction === 'suspend' ? 'suspended' : 'active';
      await api.updateStudentStatus(userId, newStatus, statusReason.trim());
      setStudent((prev) => (prev ? { ...prev, status: newStatus } : prev));
      if (newStatus === 'suspended') {
        window.dispatchEvent(new CustomEvent('learnai_account_suspended', { detail: { userId } }));
      }
      showToast(`Student status changed to ${newStatus.toUpperCase()}`, 'success');
      setStatusModalOpen(false);
      await loadData();
    } catch (err) {
      const msg = err.message || 'Failed to update status';
      setStatusError(msg);
      showToast(msg, 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    setAlertError(null);
    if (!alertTitle.trim()) {
      setAlertError('Please provide an alert title.');
      return;
    }
    if (!alertMessage.trim()) {
      setAlertError('Please provide an alert message.');
      return;
    }

    try {
      setAlertSubmitting(true);
      const targetId = parseInt(student?.id || userId, 10);
      await api.broadcastAdminAlert({
        scope: 'individual',
        target_scope: 'individual',
        target_user_ids: [targetId],
        student_ids: [targetId],
        title: alertTitle.trim(),
        message: alertMessage.trim(),
        category: alertCategory,
        link: alertLink.trim() || '/dashboard',
      });
      window.dispatchEvent(new CustomEvent('learnai_notifications_updated'));
      showToast(`Alert successfully sent to ${student?.name || 'student'}.`, 'success');
      setAlertModalOpen(false);
      setAlertTitle('');
      setAlertMessage('');
      setAlertCategory('info');
      setAlertLink('/dashboard');
      await loadData();
    } catch (err) {
      const msg = err.message || 'Failed to send alert';
      setAlertError(msg);
      showToast(msg, 'error');
    } finally {
      setAlertSubmitting(false);
    }
  };

  const handleRemoveStudent = async (e) => {
    e.preventDefault();
    setRemoveError(null);
    if (!student) return;
    if (student.is_admin) {
      setRemoveError('Protected Administrator Account: Administrator accounts cannot be deleted.');
      return;
    }
    if (removeConfirmEmail.trim().toLowerCase() !== student.email.trim().toLowerCase()) {
      setRemoveError(`Confirmation email does not match "${student.email}". Please type the exact student email.`);
      return;
    }

    try {
      setRemoveSubmitting(true);
      const targetId = student.id || userId;
      await api.deleteStudentAccount(targetId);
      showToast(`Student account ${student.email} has been permanently deleted.`, 'success');
      setRemoveModalOpen(false);
      navigate('/admin/users');
    } catch (err) {
      const msg = err.message || 'Failed to remove student account';
      setRemoveError(msg);
      showToast(msg, 'error');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const handleDownloadFile = async (docId, fileName) => {
    try {
      showToast(`Initiating download for ${fileName}...`, 'info');
      await api.downloadDocumentFile(docId, fileName);
    } catch (err) {
      showToast(err.message || 'Failed to download file', 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <div>Loading student detail profile...</div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/admin/users" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Student Accounts</span>
        </Link>
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center' }}>
          <AlertTriangle size={32} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Unable to load student record</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error || 'Student not found.'}</p>
        </div>
      </div>
    );
  }

  const usedBytes = student.storage_used_bytes || 0;
  const quotaBytes = student.custom_quota_bytes || (50 * 1024 * 1024);
  const pct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
  const isSuspended = student.status === 'suspended';
  const isOver = pct >= 100;
  const isApproaching = pct >= 80 && !isOver;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Back Link & Navigation */}
      <div>
        <Link
          to="/admin/users"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--primary)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Students</span>
        </Link>
      </div>

      {/* Student Banner Header */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: isSuspended ? '#ef4444' : 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.75rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
            }}
          >
            {student.name ? student.name[0].toUpperCase() : 'S'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {student.name}
              </h2>
              {student.is_admin && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  ADMINISTRATOR
                </span>
              )}
              {(student.email?.toLowerCase().includes('fake-domain.com') || student.name?.toLowerCase().includes('attacker')) && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                  title="Automated Security Test Fixture (Role Elevation Resistance Test)"
                >
                  🛡️ TEST FIXTURE
                </span>
              )}
              {isSuspended ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  SUSPENDED
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {student.email} • Joined {formatDate(student.created_at)}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={openQuotaModal}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <HardDrive size={16} />
            <span>Adjust Quota</span>
          </button>

          <button
            type="button"
            onClick={openAlertModal}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <Send size={16} />
            <span>Send Alert</span>
          </button>

          {isSuspended ? (
            <button
              type="button"
              onClick={() => openStatusModal('activate')}
              className="btn btn-success"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <UserCheck size={16} />
              <span>Reactivate Student</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openStatusModal('suspend')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.3)' }}
            >
              <UserX size={16} />
              <span>Suspend Account</span>
            </button>
          )}

          <button
            type="button"
            onClick={openRemoveModal}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
            title="Permanently remove or deactivate this account"
          >
            <Trash2 size={16} />
            <span>Remove Account</span>
          </button>
        </div>
      </div>

      {/* Top 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Academic Card */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            <BookOpen size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Academic Profile
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Department:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.department || 'Computer Science'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Academic Year:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.year || '3rd Year'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Skill Level:</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{student.current_skill_level || 'Intermediate'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Enrolled Courses:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.courses?.length || 0} subjects</span>
            </div>
          </div>
        </div>

        {/* Storage Quota Card */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-muted)' }}>
              <HardDrive size={18} color={isOver ? '#ef4444' : isApproaching ? '#f59e0b' : 'var(--primary)'} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Storage Allocation
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isOver ? '#ef4444' : isApproaching ? '#f59e0b' : '#22c55e' }}>
              {pct}% Used
            </span>
          </div>

          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            {formatBytes(usedBytes)}{' '}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              of {formatBytes(quotaBytes)}
            </span>
          </div>

          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                backgroundColor: isOver ? '#ef4444' : isApproaching ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>

          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Uploaded Files: {student.documents?.length || 0}</span>
            <span>Policy: 30-Day Inactive Retention</span>
          </div>
        </div>

        {/* Assessment Card */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            <GraduationCap size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assessments & Quizzes
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Quizzes Taken:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.quiz_attempts?.length || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Average Score:</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>
                {student.quiz_attempts && student.quiz_attempts.length > 0
                  ? Math.round(
                      student.quiz_attempts.reduce((sum, a) => sum + (a.score || 0), 0) /
                        student.quiz_attempts.length
                    ) + '%'
                  : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {student.quiz_attempts?.length > 0 ? 'Active Learner' : 'No Submissions Yet'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Documents Table */}
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
              Owned Uploaded Files & Learning Materials
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Physical learning files stored in the student personal repository and indexed into the RAG vector store.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {student.documents?.length || 0} files total
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>File Name</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Size</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Upload Date</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Course Association</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {!student.documents || student.documents.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No learning materials uploaded by this student.
                  </td>
                </tr>
              ) : (
                student.documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <FileText size={16} color="var(--primary)" />
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.file_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                      {formatBytes(doc.file_size)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-main)' }}>
                      {doc.subject_code ? (
                        <span style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {doc.subject_code}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>General</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDownloadFile(doc.id, doc.file_name)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Section: Enrolled Courses & Quiz Attempts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {/* Enrolled Courses */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Enrolled Course Modules
            </h3>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {!student.courses || student.courses.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active course enrollments.
              </div>
            ) : (
              student.courses.map((c) => (
                <div
                  key={c.id || c.code}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      {c.name || c.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Code: {c.code || 'N/A'} • {c.semester || 'Semester 6'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(79, 70, 229, 0.12)',
                      color: 'var(--primary)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    Enrolled
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quiz Attempts */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Recent Quiz Attempts
            </h3>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {!student.quiz_attempts || student.quiz_attempts.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No quiz submissions recorded.
              </div>
            ) : (
              student.quiz_attempts.slice(0, 5).map((q, idx) => (
                <div
                  key={q.id || idx}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      {q.topic || 'General Practice Quiz'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Difficulty: {q.difficulty || 'Intermediate'} • {formatDate(q.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: (q.score || 0) >= 70 ? '#16a34a' : '#d97706' }}>
                      {q.score || 0}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Score
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dispatched In-App Notifications & Alerts */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Bell size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Dispatched Notifications & In-App Alerts
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'var(--bg-card-subtle)',
                border: '1px solid var(--border)',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                color: 'var(--text-muted)',
              }}
            >
              {student.recent_notifications?.length || 0} alerts logged
            </span>
          </div>

          <button
            onClick={() => setAlertModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Send size={14} />
            <span>Send Direct Alert</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', width: '180px' }}>Sent Timestamp</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', width: '140px' }}>Category</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Title & Message</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', width: '120px' }}>Student Status</th>
              </tr>
            </thead>
            <tbody>
              {!student.recent_notifications || student.recent_notifications.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No in-app alerts dispatched to this student yet. Click "Send Direct Alert" to compose a message.
                  </td>
                </tr>
              ) : (
                student.recent_notifications.map((n) => (
                  <tr key={n.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(n.created_at)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span
                        style={{
                          textTransform: 'uppercase',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor:
                            n.type === 'storage_warning'
                              ? 'rgba(239, 68, 68, 0.12)'
                              : n.type === 'account_notice'
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(79, 70, 229, 0.12)',
                          color:
                            n.type === 'storage_warning'
                              ? '#ef4444'
                              : n.type === 'account_notice'
                              ? '#d97706'
                              : 'var(--primary)',
                        }}
                      >
                        {n.type || 'Notice'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                        {n.title}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: n.is_read ? '#16a34a' : '#2563eb',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: n.is_read ? '#16a34a' : '#2563eb',
                          }}
                        />
                        {n.is_read ? 'Read by Student' : 'Unread'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. ADJUST QUOTA MODAL */}
      {quotaModalOpen && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setQuotaModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              width: '92%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <HardDrive size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Update Storage Quota
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuotaModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Adjust custom allocation for <strong>{student.name}</strong> ({student.email}).
            </p>

            {/* Current Consumption Summary */}
            <div style={{ backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Consumed:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatBytes(usedBytes)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Limit:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatBytes(quotaBytes)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quota Utilization:</span>
                <span style={{ fontWeight: 700, color: pct >= 100 ? '#ef4444' : pct >= 80 ? '#d97706' : '#16a34a' }}>
                  {pct}%
                </span>
              </div>
            </div>

            {quotaError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {quotaError}
              </div>
            )}

            <form onSubmit={handleSaveQuota}>
              {/* Presets */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                  Quick Presets
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[50, 100, 250, 500, 1000].map((mb) => (
                    <button
                      key={mb}
                      type="button"
                      onClick={() => {
                        setNewQuotaMb(mb);
                        setQuotaError(null);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.78rem',
                        fontWeight: Number(newQuotaMb) === mb ? 700 : 500,
                        borderColor: Number(newQuotaMb) === mb ? 'var(--primary)' : 'var(--border)',
                        color: Number(newQuotaMb) === mb ? 'var(--primary)' : 'var(--text-main)',
                      }}
                    >
                      {mb} MB
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Custom Quota (Megabytes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  className="input-field"
                  value={newQuotaMb}
                  onChange={(e) => {
                    setNewQuotaMb(e.target.value);
                    if (quotaError) setQuotaError(null);
                  }}
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setQuotaModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={quotaSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={quotaSubmitting}
                >
                  {quotaSubmitting ? 'Saving...' : 'Apply New Quota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SUSPEND / REACTIVATE MODAL */}
      {statusModalOpen && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setStatusModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              width: '92%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {statusAction === 'suspend' ? (
                  <UserX size={22} color="#ef4444" />
                ) : (
                  <UserCheck size={22} color="#16a34a" />
                )}
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {statusAction === 'suspend' ? 'Suspend Student Account' : 'Reactivate Student Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Target student: <strong>{student.name}</strong> ({student.email})
            </p>

            {statusAction === 'suspend' ? (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                }}
              >
                <strong>Security Enforcement:</strong> Suspending will immediately invalidate all active sessions. The student will receive HTTP 403 Forbidden and will be blocked from logging in, taking quizzes, or accessing learning materials until reactivated.
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                }}
              >
                <strong>Account Restoration:</strong> Reactivating this student account restores their full access to courses, practice quizzes, AI learning assistant, and personal storage.
              </div>
            )}

            {statusError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {statusError}
              </div>
            )}

            <form onSubmit={handleSaveStatus}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Administrative Reason / Justification
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="State the reason for this action (sent to audit log and student notice)..."
                  value={statusReason}
                  onChange={(e) => {
                    setStatusReason(e.target.value);
                    if (statusError) setStatusError(null);
                  }}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={statusSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={statusAction === 'suspend' ? 'btn btn-danger' : 'btn btn-success'}
                  disabled={statusSubmitting}
                >
                  {statusSubmitting ? 'Updating...' : statusAction === 'suspend' ? 'Confirm Suspension' : 'Reactivate Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SEND ALERT MODAL */}
      {alertModalOpen && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setAlertModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '540px',
              width: '92%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Send size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Send Alert to {student.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAlertModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
              Direct in-app notification delivered to <strong>{student.name}</strong> ({student.email})&apos;s authenticated Notification Center.
            </p>

            {alertError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {alertError}
              </div>
            )}

            <form onSubmit={handleSendAlert}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Category
                </label>
                <select
                  className="input-field"
                  value={alertCategory}
                  onChange={(e) => setAlertCategory(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="info">General Information</option>
                  <option value="warning">Important Warning</option>
                  <option value="deadline">Academic Deadline</option>
                  <option value="quota_alert">Storage Quota Notice</option>
                  <option value="system_notice">System Maintenance</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Alert Title
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Action Required: Storage Quota Approaching Limit"
                  value={alertTitle}
                  onChange={(e) => {
                    setAlertTitle(e.target.value);
                    if (alertError) setAlertError(null);
                  }}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Alert Message
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Enter clear instruction or notification text for this student..."
                  value={alertMessage}
                  onChange={(e) => {
                    setAlertMessage(e.target.value);
                    if (alertError) setAlertError(null);
                  }}
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Target Section Link (Safe Student Route)
                </label>
                <select
                  className="input-field"
                  value={alertLink}
                  onChange={(e) => setAlertLink(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="/dashboard">Student Dashboard (/dashboard)</option>
                  <option value="/knowledge-base">Knowledge Base & Uploads (/knowledge-base)</option>
                  <option value="/quiz">Practice Quizzes (/quiz)</option>
                  <option value="/settings">Account Settings & Feedback (/settings)</option>
                  <option value="/my-learning">My Courses & Syllabus (/my-learning)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setAlertModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={alertSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={alertSubmitting}
                >
                  {alertSubmitting ? 'Sending...' : 'Send Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REMOVE ACCOUNT MODAL */}
      {removeModalOpen && student && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setRemoveModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '540px',
              width: '92%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Trash2 size={22} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>
                  Remove Student Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRemoveModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                title="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {student.is_admin ? (
              <div>
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: '#ef4444',
                  }}
                >
                  <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.875rem' }}>
                    <strong>Protected Administrator Account:</strong> <strong>{student.name}</strong> has administrator privileges. Administrator accounts cannot be deleted to prevent accidental platform lockouts.
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setRemoveModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRemoveStudent}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                  You are preparing to remove the account for <strong>{student.name}</strong> ({student.email}).
                </p>

                {/* Institutional Safeguards Info Box */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={14} color="#16a34a" />
                    <span>Institutional Data Safeguards</span>
                  </div>
                  <div>
                    Shared faculty course materials, curriculum PDFs, and administrative audit trails will remain preserved. Only this student&apos;s personal profile and private uploads will be removed.
                  </div>
                </div>

                {/* Alternative Option: Suspend */}
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                    <strong>Prefer temporary deactivation?</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Blocks login while preserving all student records.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveModalOpen(false);
                      setStatusAction('suspend');
                      setStatusReason('');
                      setStatusModalOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                  >
                    Deactivate Instead
                  </button>
                </div>

                {removeError && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {removeError}
                  </div>
                )}

                {/* Permanent Deletion Email Confirmation */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    To confirm permanent deletion, type the student&apos;s email address:
                  </label>
                  <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.35rem' }}>
                    {student.email}
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={`Type ${student.email} to confirm`}
                    value={removeConfirmEmail}
                    onChange={(e) => {
                      setRemoveConfirmEmail(e.target.value);
                      if (removeError) setRemoveError(null);
                    }}
                    style={{ width: '100%' }}
                    autoComplete="off"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setRemoveModalOpen(false)}
                    className="btn btn-secondary"
                    disabled={removeSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={
                      removeSubmitting ||
                      removeConfirmEmail.trim().toLowerCase() !== student.email.trim().toLowerCase()
                    }
                    style={{
                      opacity:
                        removeConfirmEmail.trim().toLowerCase() === student.email.trim().toLowerCase()
                          ? 1
                          : 0.5,
                      cursor:
                        removeConfirmEmail.trim().toLowerCase() === student.email.trim().toLowerCase()
                          ? 'pointer'
                          : 'not-allowed',
                    }}
                  >
                    {removeSubmitting ? 'Deleting...' : 'Permanently Delete Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
