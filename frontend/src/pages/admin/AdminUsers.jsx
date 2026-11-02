import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  UserCheck,
  UserX,
  Edit2,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { api, isAdminDemoMode, setAdminDemoMode } from '../../services/api';

export default function AdminUsers() {
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const showToast = outletCtx?.showToast || ((msg) => console.log(msg));

  // Users Table State
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [search, setSearch] = useState('');
  const [warningFilter, setWarningFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Quota Modal State
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState(null);
  const [newQuotaMb, setNewQuotaMb] = useState(50);
  const [quotaSubmitting, setQuotaSubmitting] = useState(false);

  // Status Modal State (Suspend / Reactivate)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState('suspend'); // 'suspend' | 'activate'
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Alert Modal State
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCategory, setAlertCategory] = useState('info');
  const [alertSubmitting, setAlertSubmitting] = useState(false);

  // Remove / Delete Modal State
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeConfirmEmail, setRemoveConfirmEmail] = useState('');
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (warningFilter !== 'all') params.warning_filter = warningFilter;

      const res = await api.getAdminUsers(params);
      let items = res.items || [];
      if (statusFilter !== 'all') {
        items = items.filter((u) => u.status === statusFilter);
      }
      setUsers(items);
      setTotalUsers(res.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load student accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, warningFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openQuotaModal = (student) => {
    setTargetStudent(student);
    const mb = student.custom_quota_bytes
      ? Math.round(student.custom_quota_bytes / (1024 * 1024))
      : 50;
    setNewQuotaMb(mb);
    setQuotaModalOpen(true);
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!targetStudent) return;
    try {
      setQuotaSubmitting(true);
      await api.updateUserQuota(targetStudent.id, parseInt(newQuotaMb, 10));
      showToast(`Quota for ${targetStudent.name} updated to ${newQuotaMb} MB`, 'success');
      setQuotaModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update quota', 'error');
    } finally {
      setQuotaSubmitting(false);
    }
  };

  const openStatusModal = (student, action) => {
    setTargetStudent(student);
    setStatusAction(action);
    setStatusReason('');
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!targetStudent) return;
    try {
      setStatusSubmitting(true);
      const newStatus = statusAction === 'suspend' ? 'suspended' : 'active';
      await api.updateStudentStatus(targetStudent.id, newStatus, statusReason);
      showToast(
        `Student account ${targetStudent.name} is now ${newStatus.toUpperCase()}`,
        'success'
      );
      setStatusModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update student status', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const openAlertModal = (student) => {
    setTargetStudent(student);
    setAlertTitle('');
    setAlertMessage('');
    setAlertCategory('info');
    setAlertModalOpen(true);
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    if (!targetStudent || !alertTitle.trim() || !alertMessage.trim()) {
      showToast('Please provide both title and message.', 'error');
      return;
    }
    try {
      setAlertSubmitting(true);
      await api.broadcastAdminAlert({
        scope: 'individual',
        target_user_ids: [targetStudent.id],
        title: alertTitle.trim(),
        message: alertMessage.trim(),
        category: alertCategory,
      });
      showToast(`Alert sent to ${targetStudent.name}`, 'success');
      setAlertModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to send alert', 'error');
    } finally {
      setAlertSubmitting(false);
    }
  };

  const openRemoveModal = (student) => {
    setTargetStudent(student);
    setRemoveConfirmEmail('');
    setRemoveModalOpen(true);
  };

  const handleRemoveStudent = async (e) => {
    e.preventDefault();
    if (!targetStudent) return;
    if (targetStudent.is_admin) {
      showToast('Administrator accounts cannot be deleted.', 'error');
      return;
    }
    if (removeConfirmEmail.trim().toLowerCase() !== targetStudent.email.trim().toLowerCase()) {
      showToast('Confirmation email does not match. Please type the exact student email.', 'error');
      return;
    }

    try {
      setRemoveSubmitting(true);
      await api.deleteStudentAccount(targetStudent.id);
      showToast(`Student account ${targetStudent.email} permanently removed.`, 'success');
      setRemoveModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to remove student account', 'error');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Student Account Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Inspect student storage quotas, academic progress, account status, and issue direct administrative notices.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search students by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status:</span>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            >
              <option value="all">All Accounts</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>

          {/* Quota Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Storage:</span>
            <select
              className="input-field"
              value={warningFilter}
              onChange={(e) => {
                setWarningFilter(e.target.value);
                setPage(1);
              }}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
            >
              <option value="all">All Quotas</option>
              <option value="over_quota">Exceeding Quota</option>
              <option value="approaching_quota">Approaching (&gt;80%)</option>
              <option value="normal">Normal Usage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="admin-table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '260px' }}>Student Name & Email</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '180px' }}>Department & Year</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '200px' }}>Storage Consumed</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '130px' }}>Account Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '140px' }}>Retention Warning</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '340px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)' }} />
                      <span>Loading student accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>No student accounts found matching your search criteria.</p>
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
                            padding: '0.45rem 1rem',
                            fontWeight: 600,
                          }}
                        >
                          <Sparkles size={15} color="#d97706" />
                          <span>Explore 14 Sample Students in Demo Mode</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((student) => {
                  const usedBytes = student.storage_used_bytes || 0;
                  const quotaBytes = student.custom_quota_bytes || (50 * 1024 * 1024);
                  const pct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
                  const isSuspended = student.status === 'suspended';
                  const isOver = pct >= 100;
                  const isApproaching = pct >= 80 && !isOver;
                  const isSecurityTest =
                    student.email?.toLowerCase().includes('fake-domain.com') ||
                    student.name?.toLowerCase().includes('attacker');

                  return (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s',
                      }}
                      className="table-row-hover"
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '1rem', minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: isSuspended ? '#ef4444' : isSecurityTest ? '#6366f1' : 'var(--primary)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              flexShrink: 0,
                            }}
                          >
                            {isSecurityTest ? '🛡️' : (student.name ? student.name[0].toUpperCase() : 'S')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span>{student.name}</span>
                              {student.is_admin && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '9999px',
                                    fontWeight: 700,
                                  }}
                                >
                                  ADMIN
                                </span>
                              )}
                              {isSecurityTest && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                    color: '#6366f1',
                                    border: '1px solid rgba(99, 102, 241, 0.35)',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '9999px',
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title="Automated Security Test Fixture (Role Elevation Resistance Test)"
                                >
                                  🛡️ TEST FIXTURE
                                </span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dept & Year */}
                      <td style={{ padding: '1rem', color: 'var(--text-main)' }}>
                        <div style={{ fontWeight: 500 }}>{student.department || 'Computer Science'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {student.year || '3rd Year'} • {student.current_skill_level || 'Intermediate'}
                        </div>
                      </td>

                      {/* Storage */}
                      <td style={{ padding: '1rem', minWidth: '180px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 600, color: isOver ? '#ef4444' : isApproaching ? '#f59e0b' : 'var(--text-main)' }}>
                            {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: isOver ? '#ef4444' : isApproaching ? '#f59e0b' : '#22c55e',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem' }}>
                        {isSuspended ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <UserX size={13} />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(34, 197, 94, 0.12)',
                              color: '#16a34a',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <UserCheck size={13} />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* Warning */}
                      <td style={{ padding: '1rem' }}>
                        {student.warning_status === 'over_quota' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <AlertTriangle size={13} />
                            <span>Exceeded</span>
                          </span>
                        ) : student.warning_status === 'approaching_quota' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#d97706',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <AlertCircle size={13} />
                            <span>Approaching</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Normal</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', textAlign: 'right', minWidth: '340px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <Link
                            to={`/admin/users/${student.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="View Full Student Profile"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </Link>

                          <button
                            onClick={() => openQuotaModal(student)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Adjust Storage Quota"
                          >
                            <HardDrive size={14} />
                            <span>Quota</span>
                          </button>

                          <button
                            onClick={() => openAlertModal(student)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Send Direct Alert"
                          >
                            <Send size={14} />
                            <span>Alert</span>
                          </button>

                          {isSuspended ? (
                            <button
                              onClick={() => openStatusModal(student, 'activate')}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Reactivate Account"
                            >
                              <UserCheck size={14} />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openStatusModal(student, 'suspend')}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.3)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Suspend Account"
                            >
                              <UserX size={14} />
                              <span>Suspend</span>
                            </button>
                          )}

                          <button
                            onClick={() => openRemoveModal(student)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.4rem 0.65rem',
                              fontSize: '0.8rem',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                            title="Remove Student Account"
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Showing {users.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, totalUsers)} of {totalUsers} student accounts
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', padding: '0 0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Quota Modal */}
      {quotaModalOpen && targetStudent && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setQuotaModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
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
                onClick={() => setQuotaModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Adjust custom allocation for <strong>{targetStudent.name}</strong> ({targetStudent.email}).
            </p>

            {/* Current Consumption Summary */}
            <div style={{ backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Consumed:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatBytes(targetStudent.storage_used_bytes || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Active Limit:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatBytes(targetStudent.custom_quota_bytes || 52428800)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveQuota}>
              {/* Presets */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                  Quick Presets
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[50, 100, 250, 500].map((mb) => (
                    <button
                      key={mb}
                      type="button"
                      onClick={() => setNewQuotaMb(mb)}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: parseInt(newQuotaMb, 10) === mb ? 'var(--primary)' : 'var(--bg-card-subtle)',
                        color: parseInt(newQuotaMb, 10) === mb ? '#ffffff' : 'var(--text-main)',
                        borderColor: parseInt(newQuotaMb, 10) === mb ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      {mb} MB {mb === 50 ? '(Default)' : ''}
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
                  max="5000"
                  className="input-field"
                  value={newQuotaMb}
                  onChange={(e) => setNewQuotaMb(e.target.value)}
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600 }}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Equivalent to {(parseInt(newQuotaMb || 0, 10) * 1024 * 1024).toLocaleString()} bytes. Standard default is 50 MB.
                </div>
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

      {/* Suspend / Reactivate Modal */}
      {statusModalOpen && targetStudent && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setStatusModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
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
                onClick={() => setStatusModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {statusAction === 'suspend' ? (
                <>
                  Suspending <strong>{targetStudent.name}</strong> will block login access to the LearnAI platform immediately.
                </>
              ) : (
                <>
                  Reactivating <strong>{targetStudent.name}</strong> will restore full access to their courses, AI tutor, and quizzes.
                </>
              )}
            </p>

            <form onSubmit={handleSaveStatus}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Administrative Reason (Sent to Student & Logged)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder={statusAction === 'suspend' ? 'e.g. Terms violation, honor code inquiry, account audit...' : 'e.g. Resolved investigation, request fulfilled...'}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
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

      {/* Alert Modal */}
      {alertModalOpen && targetStudent && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setAlertModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Send size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Send Alert to {targetStudent.name}
                </h3>
              </div>
              <button
                onClick={() => setAlertModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

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
                  onChange={(e) => setAlertTitle(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Alert Message
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Enter clear instruction or notification text for this student..."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
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

      {/* Remove / Delete Modal */}
      {removeModalOpen && targetStudent && (
        <div
          className="admin-modal-overlay modal-backdrop"
          onClick={() => setRemoveModalOpen(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="admin-modal-card modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
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
                onClick={() => setRemoveModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {targetStudent.is_admin ? (
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
                    <strong>Protected Administrator Account:</strong> <strong>{targetStudent.name}</strong> has administrator privileges. Administrator accounts cannot be deleted to prevent accidental platform lockouts.
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
                  You are preparing to remove the account for <strong>{targetStudent.name}</strong> ({targetStudent.email}).
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
                      openStatusModal(targetStudent, 'suspend');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                  >
                    Deactivate Instead
                  </button>
                </div>

                {/* Permanent Deletion Email Confirmation */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    To confirm permanent deletion, type the student&apos;s email address:
                  </label>
                  <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.35rem' }}>
                    {targetStudent.email}
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={`Type ${targetStudent.email} to confirm`}
                    value={removeConfirmEmail}
                    onChange={(e) => setRemoveConfirmEmail(e.target.value)}
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
                      removeConfirmEmail.trim().toLowerCase() !== targetStudent.email.trim().toLowerCase()
                    }
                    style={{
                      opacity:
                        removeConfirmEmail.trim().toLowerCase() === targetStudent.email.trim().toLowerCase()
                          ? 1
                          : 0.5,
                      cursor:
                        removeConfirmEmail.trim().toLowerCase() === targetStudent.email.trim().toLowerCase()
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
