import React, { useEffect, useState } from 'react';
import { HardDrive, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw, FileText, Download } from 'lucide-react';
import { api } from '../services/api';

export default function StorageWidget({ onStorageChange, compact = false }) {
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStudentStorage();
      setStorage(data);
      if (onStorageChange) onStorageChange(data);
    } catch (err) {
      console.error('Failed to load storage details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
    const handleSync = () => fetchStorage();
    window.addEventListener('focus', handleSync);
    window.addEventListener('learnai_storage_updated', handleSync);
    window.addEventListener('learnai_notifications_updated', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('learnai_storage_updated', handleSync);
      window.removeEventListener('learnai_notifications_updated', handleSync);
    };
  }, []);

  if (loading && !storage) {
    return (
      <div
        style={{
          padding: compact ? '0.75rem' : '1.25rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
        }}
      >
        <RefreshCw size={16} className="spin-animation" />
        <span>Loading storage quota metrics...</span>
      </div>
    );
  }

  if (error && !storage) {
    return null; // Silently fail or minimal error
  }

  const percent = storage ? Math.min(Math.round(storage.used_percentage), 100) : 0;
  const isExceeded = storage?.is_over_quota;
  const isWarning = storage?.in_warning && !isExceeded;

  let barColor = 'var(--primary)';
  if (isExceeded) barColor = 'var(--danger)';
  else if (isWarning) barColor = 'var(--warning)';

  return (
    <div
      style={{
        padding: compact ? '1rem' : '1.25rem',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isExceeded ? 'rgba(239, 68, 68, 0.4)' : isWarning ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isExceeded
                ? 'var(--danger-light)'
                : isWarning
                ? 'var(--warning-light)'
                : 'var(--primary-light)',
              color: isExceeded ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
              Personal Storage Quota
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {storage?.user_files_count || 0} user uploads &bull; Shared course materials excluded
            </div>
          </div>
        </div>

        <button
          onClick={fetchStorage}
          disabled={loading}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Refresh storage quota"
        >
          <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
        </button>
      </div>

      {/* Progress Bar & Numbers */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            marginBottom: '0.35rem',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
            {storage?.used_formatted} of {storage?.quota_formatted} used
          </span>
          <span
            style={{
              fontWeight: 700,
              color: isExceeded ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--text-muted)',
            }}
          >
            {storage?.used_percentage?.toFixed(1)}%
          </span>
        </div>

        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'var(--bg-surface-hover)',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(storage?.used_percentage || 0, 100)}%`,
              height: '100%',
              backgroundColor: barColor,
              borderRadius: '9999px',
              transition: 'width 0.3s ease, background-color 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Active Warning Alerts */}
      {isExceeded && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            fontSize: '0.8125rem',
            color: 'var(--danger)',
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700 }}>Storage Quota Exceeded (100%+)</div>
            <div>
              You cannot upload additional study documents until you delete unused files or request a quota increase.
              {storage?.active_warning?.resolution_deadline && (
                <div style={{ marginTop: '0.3rem', fontWeight: 600 }}>
                  Automated cleanup retention deadline: {new Date(storage.active_warning.resolution_deadline).toLocaleDateString()}
                  {storage.active_warning.days_remaining != null && (
                    <span> ({storage.active_warning.days_remaining} days remaining)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isWarning && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--warning-light)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            fontSize: '0.8125rem',
            color: '#b45309',
            lineHeight: 1.4,
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700 }}>Approaching Storage Quota (80%+ Used)</div>
            <div>
              Consider deleting old notes or unused textbook chapters to maintain seamless upload capabilities.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
