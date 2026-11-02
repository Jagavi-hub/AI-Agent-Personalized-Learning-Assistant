import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Users,
  HardDrive,
  MessageSquare,
  Activity,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  RefreshCw,
  Bell,
  Sliders,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminOverview() {
  const { showToast } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, healthRes, warnRes] = await Promise.all([
        api.getAdminDashboardStats(),
        api.getAdminSystemHealth().catch(() => null),
        api.getStorageWarnings('active').catch(() => [])
      ]);
      setStats(statsRes);
      setHealth(healthRes);
      setWarnings(warnRes || []);
    } catch (err) {
      showToast(err.message || 'Failed to load overview data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem auto' }} />
        <div>Loading administrative metrics...</div>
      </div>
    );
  }

  const uStats = stats?.users || {};
  const sStats = stats?.storage || {};
  const fStats = stats?.feedback || {};
  const recentEvents = stats?.recent_events || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner & Quick Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            Admin Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Overview of active students, system storage, support tickets, and activity.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Critical Storage Warning Banner if any students are over quota */}
      {sStats.users_over_quota > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>
                {sStats.users_over_quota} Student Account(s) Exceeding Quota
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                30-day grace period active. Review student accounts and storage allowances.
              </div>
            </div>
          </div>
          <Link
            to="/admin/storage"
            className="btn btn-sm btn-danger"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
          >
            Review Storage & Deadlines <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Primary KPI Grid (4 Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Card 1: Registered Students */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Registered Students</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {uStats.total_registered || 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#16a34a' }}>
            <TrendingUp size={14} />
            <span>{uStats.active_last_7d || 0} active in last 7 days</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <Link to="/admin/users" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Manage accounts <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 2: Actual Uploaded Storage */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Student Upload Storage</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <HardDrive size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {sStats.total_user_storage_formatted || '0 B'}
          </div>
          <div style={{ fontSize: '0.8rem', color: sStats.users_over_quota > 0 ? '#ef4444' : 'var(--text-muted)' }}>
            {sStats.users_over_quota || 0} exceeding quota ({sStats.users_in_warning || 0} in warning)
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <Link to="/admin/storage" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Inspect storage & quotas <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 3: Support Feedback */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Student Support Tickets</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <MessageSquare size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {fStats.open_feedback || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: fStats.awaiting_admin > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
            {fStats.awaiting_admin || 0} awaiting faculty reply • {fStats.average_rating || 5.0}★ avg
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <Link to="/admin/feedback" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Open support center <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 4: System Health */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>System Health</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: 1.2 }}>
            <CheckCircle2 size={24} />
            <span>{health?.overall_status?.toUpperCase() || 'HEALTHY'}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            DB: {health?.database?.database_size_formatted || 'Active'} • Disk Free: {health?.storage?.disk_free_formatted || 'OK'}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <Link to="/admin/system-health" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Detailed diagnostics <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Two-Column Lower Section: Quick Actions & Recent Audit Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Quick Management Shortcuts */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Administrative Control Shortcuts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              to="/admin/users"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-surface-elevated, rgba(255,255,255,0.02))',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={18} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Student Account Management</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Search students, update quotas & manage suspensions</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </Link>

            <Link
              to="/admin/alerts"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-surface-elevated, rgba(255,255,255,0.02))',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bell size={18} color="#f59e0b" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Broadcast Announcement</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send urgent campus notice or system broadcast</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </Link>

            <Link
              to="/admin/storage"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-surface-elevated, rgba(255,255,255,0.02))',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <HardDrive size={18} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>30-Day Storage Cleanup Queue</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inspect retention grace periods & test dry-run</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </Link>

            <Link
              to="/admin/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-surface-elevated, rgba(255,255,255,0.02))',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Sliders size={18} color="#8b5cf6" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Platform Operational Settings</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configure default quotas & warning thresholds</div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </Link>
          </div>
        </div>

        {/* Recent Audit Trail Stream */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Recent Audit Stream
            </h3>
            <Link to="/admin/audit" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              View all
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No administrative events recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '320px' }}>
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.825rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      <code>{evt.action}</code>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Actor: {evt.admin_email}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
