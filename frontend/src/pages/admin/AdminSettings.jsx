import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Sliders,
  HardDrive,
  Shield,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  Bell,
} from 'lucide-react';
import { api } from '../../services/api';
import { useStudent } from '../../context/StudentContext';

export default function AdminSettings() {
  const { profile } = useStudent();
  const outletCtx = useOutletContext();
  const showToast = outletCtx?.showToast || ((msg) => console.log(msg));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [defaultQuotaMb, setDefaultQuotaMb] = useState(50);
  const [warningThresholdPct, setWarningThresholdPct] = useState(80);
  const [retentionDays, setRetentionDays] = useState(30);
  const [dryRunDefault, setDryRunDefault] = useState(true);
  const [maxUploadMb, setMaxUploadMb] = useState(25);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminSettings();
      if (res) {
        const quota = res.default_quota_mb ?? res.default_storage_quota_mb;
        if (quota !== undefined && quota !== null) setDefaultQuotaMb(quota);

        const warningPct = res.warning_threshold_pct ?? res.storage_warning_threshold;
        if (warningPct !== undefined && warningPct !== null) setWarningThresholdPct(warningPct);

        const days = res.retention_days ?? res.cleanup_grace_period_days;
        if (days !== undefined && days !== null) setRetentionDays(days);

        const dryRun = res.dry_run_default ?? res.cleanup_dry_run_enabled;
        if (dryRun !== undefined && dryRun !== null) setDryRunDefault(dryRun);

        if (res.max_upload_mb !== undefined && res.max_upload_mb !== null) setMaxUploadMb(res.max_upload_mb);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load platform settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const quotaVal = parseInt(defaultQuotaMb, 10);
      const warnVal = parseInt(warningThresholdPct, 10);
      const daysVal = parseInt(retentionDays, 10);
      const dryVal = Boolean(dryRunDefault);
      const uploadVal = parseInt(maxUploadMb, 10);

      const payload = {
        default_quota_mb: quotaVal,
        default_storage_quota_mb: quotaVal,
        warning_threshold_pct: warnVal,
        storage_warning_threshold: warnVal,
        retention_days: daysVal,
        cleanup_grace_period_days: daysVal,
        dry_run_default: dryVal,
        cleanup_dry_run_enabled: dryVal,
        max_upload_mb: uploadVal,
      };

      await api.updateAdminSettings(payload);
      showToast('Platform operational settings saved and applied!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update platform settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Platform Operational Settings
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Configure global quotas, 30-day retention countdown policies, and safety thresholds across LearnAI.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Reload</span>
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Storage & Quota Settings Card */}
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
            <HardDrive size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Storage Allocation & Capacity Rules
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* Default Quota */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Default Student Quota (MB)
              </label>
              <input
                type="number"
                min="10"
                max="2000"
                className="input-field"
                value={defaultQuotaMb}
                onChange={(e) => setDefaultQuotaMb(e.target.value)}
                style={{ width: '100%' }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Applied automatically to newly registered students.
              </span>
            </div>

            {/* Warning Threshold */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Warning Trigger Threshold (%)
              </label>
              <input
                type="number"
                min="50"
                max="99"
                className="input-field"
                value={warningThresholdPct}
                onChange={(e) => setWarningThresholdPct(e.target.value)}
                style={{ width: '100%' }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Trigger warning notification when usage exceeds this percentage.
              </span>
            </div>

            {/* Max Upload File Size */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Max Single File Upload (MB)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                className="input-field"
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(e.target.value)}
                style={{ width: '100%' }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Cap on individual PDF course materials uploaded by students.
              </span>
            </div>
          </div>
        </div>

        {/* 30-Day Retention Policy Card */}
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
            <Clock size={20} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Inactive File Retention & Automated Cleanup
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Grace Period */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Retention Grace Period (Days)
              </label>
              <input
                type="number"
                min="7"
                max="180"
                className="input-field"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                style={{ width: '100%' }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Days student has to self-manage files after receiving over-quota warning.
              </span>
            </div>

            {/* Dry Run Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', marginTop: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={dryRunDefault}
                  onChange={(e) => setDryRunDefault(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Enforce Dry-Run Mode by Default
                </span>
              </label>
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.25rem', marginLeft: '1.75rem' }}>
                Prevents accidental destructive purges unless explicitly overridden.
              </span>
            </div>
          </div>
        </div>

        {/* Server Security & Allowlist Notice Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <Shield size={20} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Server-Side Administrator Authorization (ADMIN_EMAILS)
            </h3>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
            To prevent privilege escalation, administrator status cannot be assigned via client requests. Access to the Admin Portal and <code>/api/admin/*</code> routes is strictly enforced on the FastAPI backend using the <code>ADMIN_EMAILS</code> environment variable and verified password hashes.
          </p>

          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Logged-in Administrator:</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>{profile?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Backend Configuration File:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>.env (ADMIN_EMAILS)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>CLI Management Tool:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>python backend/manage_admin.py</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving Settings...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
