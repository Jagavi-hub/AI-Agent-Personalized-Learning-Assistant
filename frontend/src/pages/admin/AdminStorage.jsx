import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  HardDrive,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Search,
  Sparkles,
} from 'lucide-react';
import { api, isAdminDemoMode, setAdminDemoMode } from '../../services/api';

export default function AdminStorage() {
  const outletCtx = useOutletContext();
  const showToast = outletCtx?.showToast || ((msg) => console.log(msg));

  const [stats, setStats] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [cleanupLogs, setCleanupLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dry-run preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [targetStudent, setTargetStudent] = useState(null);

  // Execute cleanup modal
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [graceDays, setGraceDays] = useState(30);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, warnRes, logsRes] = await Promise.all([
        api.getAdminDashboardStats().catch(() => null),
        api.getStorageWarnings('active').catch(() => []),
        api.getCleanupLogs().catch(() => []),
      ]);
      setStats(statsRes);
      setWarnings(warnRes || []);
      setCleanupLogs(logsRes || []);
    } catch (err) {
      showToast(err.message || 'Failed to load storage telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPreview = async (warning) => {
    setTargetStudent({
      id: warning.student_id,
      name: warning.student_name,
      email: warning.student_email,
    });
    setPreviewModalOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await api.previewCleanup(warning.student_id, graceDays);
      setPreviewData(res);
    } catch (err) {
      showToast(err.message || 'Failed to generate cleanup preview', 'error');
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenExecute = (warning) => {
    setTargetStudent({
      id: warning.student_id,
      name: warning.student_name,
      email: warning.student_email,
    });
    setExecuteModalOpen(true);
  };

  const handleConfirmExecute = async () => {
    if (!targetStudent) return;
    try {
      setExecuting(true);
      const res = await api.executeCleanup(targetStudent.id, graceDays);
      showToast(
        `Cleanup executed: ${res.files_deleted_count || 0} files removed, ${formatBytes(res.bytes_reclaimed || 0)} reclaimed`,
        'success'
      );
      setExecuteModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to execute storage cleanup', 'error');
    } finally {
      setExecuting(false);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Storage & 30-Day Retention Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Monitor student storage consumption, enforce the 30-day inactive retention policy, and run dry-run cleanup workflows.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Total Platform Storage */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
            <HardDrive size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Storage Consumed</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {formatBytes(stats?.storage?.total_used_bytes || 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Across all enrolled student personal libraries
          </div>
        </div>

        {/* Active Quota Warnings */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Retention Warnings</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: warnings.length > 0 ? '#f59e0b' : 'var(--text-main)' }}>
            {warnings.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Students exceeding or nearing quota limit
          </div>
        </div>

        {/* Policy Configuration */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
            <Clock size={18} color="#22c55e" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Retention Policy</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            30-Day Inactive Window
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginTop: '0.25rem' }}>
            Dry-Run Default: Safe Mode Enabled
          </div>
        </div>
      </div>

      {/* Active Warnings Table */}
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
              Active Quota Warnings & Retention Timers
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Students who have exceeded their storage allocation. Accounts in this state enter a 30-day grace period.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {warnings.length} active warnings
          </span>
        </div>

        <div className="admin-table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Student Name & Email</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Storage Consumed</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Warning Date</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Elapsed / Remaining</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && warnings.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading active warnings...
                  </td>
                </tr>
              ) : warnings.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: '#16a34a' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={24} color="#16a34a" />
                      <span style={{ fontWeight: 600 }}>All student accounts are operating safely within quota limits.</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active retention countdowns in the current database.</span>
                      {!isAdminDemoMode() && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdminDemoMode(true);
                            window.location.reload();
                          }}
                          className="btn btn-sm btn-outline"
                          style={{
                            marginTop: '0.35rem',
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
                          <span>Preview Approaching & Over-Quota Workflows in Demo Mode</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                warnings.map((w) => {
                  const daysElapsed = w.days_elapsed || 0;
                  const daysRemaining = Math.max(0, 30 - daysElapsed);
                  const isExpired = daysRemaining === 0;

                  return (
                    <tr key={w.id || w.student_id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{w.student_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem' }}>{w.student_email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#ef4444' }}>
                          {formatBytes(w.storage_used_bytes)} / {formatBytes(w.quota_bytes || 52428800)}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                        {formatDate(w.warning_date || w.created_at)}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isExpired ? '#ef4444' : '#d97706',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          <Clock size={12} />
                          <span>{isExpired ? 'Grace Period Expired' : `${daysRemaining} days remaining`}</span>
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenPreview(w)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Safe Dry-Run Preview (No Deletions)"
                          >
                            <Eye size={14} />
                            <span>Preview Dry Run</span>
                          </button>
                          <button
                            onClick={() => handleOpenExecute(w)}
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Execute 30-Day Cleanup"
                          >
                            <Trash2 size={14} />
                            <span>Execute</span>
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
      </div>

      {/* Historical Cleanup Logs Table */}
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
              Storage Retention Cleanup Logs
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Complete record of automated and administrator-triggered cleanup operations.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {cleanupLogs.length} logged runs
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Timestamp</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Student</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Files Removed</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bytes Reclaimed</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mode</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {cleanupLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No cleanup operations have been executed yet.
                  </td>
                </tr>
              ) : (
                cleanupLogs.map((log, idx) => (
                  <tr key={log.id || idx} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                      {formatDate(log.created_at || log.timestamp)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 500, color: 'var(--text-main)' }}>
                      {log.student_name || `Student #${log.student_id}`}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-main)' }}>
                      {log.files_deleted_count ?? log.files_deleted ?? 0} files
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#16a34a', fontWeight: 600 }}>
                      {formatBytes(log.bytes_reclaimed || 0)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      {log.is_dry_run ? (
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          Dry Run Preview
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          Real Execution
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>
                        <CheckCircle2 size={14} />
                        <span>Completed</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dry Run Preview Modal */}
      {previewModalOpen && targetStudent && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '560px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Eye size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Dry-Run Cleanup Preview
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--primary)' }}>
              <strong>Safe Simulation Mode:</strong> No files will be modified or deleted during this preview.
            </div>

            {previewLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                <div>Analyzing candidate files older than {graceDays} days...</div>
              </div>
            ) : previewData ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Candidate Files</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {previewData.files_candidate_count || 0} files
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reclaimable Space</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>
                      {formatBytes(previewData.bytes_reclaimable || 0)}
                    </div>
                  </div>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem' }}>
                  {(!previewData.candidate_files || previewData.candidate_files.length === 0) ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No inactive files qualifying for deletion under the {graceDays}-day retention policy.
                    </div>
                  ) : (
                    previewData.candidate_files.map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{f.file_name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{formatBytes(f.file_size)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="btn btn-secondary"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execute Cleanup Confirmation Modal */}
      {executeModalOpen && targetStudent && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div
            className="modal-content"
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
                <Trash2 size={22} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Execute 30-Day Cleanup
                </h3>
              </div>
              <button
                onClick={() => setExecuteModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              This will permanently purge uploaded learning materials for <strong>{targetStudent.name}</strong> that have exceeded the {graceDays}-day retention policy.
            </p>

            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#ef4444' }}>
              <strong>Caution:</strong> This operation is permanent and irreversible. A full audit log entry will be recorded under your administrator ID.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setExecuteModalOpen(false)}
                className="btn btn-secondary"
                disabled={executing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExecute}
                className="btn btn-danger"
                disabled={executing}
              >
                {executing ? 'Executing Cleanup...' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
