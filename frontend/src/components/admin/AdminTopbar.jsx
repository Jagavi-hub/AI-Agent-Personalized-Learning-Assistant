import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Activity,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  ExternalLink,
  Lock,
  Sparkles,
  Database,
  Menu
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';
import { useTheme } from '../../context/ThemeContext';
import { api, isAdminDemoMode, setAdminDemoMode } from '../../services/api';

const ROUTE_TITLES = {
  '/admin': 'Platform Overview',
  '/admin/users': 'Student Accounts & Quotas',
  '/admin/storage': 'Storage & 30-Day Retention',
  '/admin/alerts': 'Alerts & Broadcast Composer',
  '/admin/feedback': 'Student Support & Feedback',
  '/admin/system-health': 'System Health & Diagnostics',
  '/admin/audit': 'Administrative Audit Log',
  '/admin/settings': 'Platform Settings',
};

export default function AdminTopbar({ onToggleMobileMenu }) {
  const location = useLocation();
  const { profile } = useStudent();
  const { theme, toggleTheme } = useTheme();
  const [healthStatus, setHealthStatus] = useState('checking');
  const [isDemo, setIsDemo] = useState(() => isAdminDemoMode());

  useEffect(() => {
    let mounted = true;
    api.getHealth()
      .then(() => {
        if (mounted) setHealthStatus('online');
      })
      .catch(() => {
        if (mounted) setHealthStatus('offline');
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleModeChange = (e) => {
      setIsDemo(!!e.detail?.enabled);
    };
    window.addEventListener('learnai_admin_demo_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('learnai_admin_demo_mode_changed', handleModeChange);
    };
  }, []);

  const currentTitle = ROUTE_TITLES[location.pathname] || 
    (location.pathname.startsWith('/admin/users/') ? 'Student Detail Profile' : 'Admin Console');

  const handleToggleDemoMode = () => {
    const nextState = !isDemo;
    setAdminDemoMode(nextState);
    window.location.reload();
  };

  return (
    <header
      className="app-topbar"
      style={{
        height: '70px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Breadcrumb / Page Title + Mobile Hamburger Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle Admin Navigation Menu"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span style={{ fontWeight: 600 }}>Admin Portal</span>
          <ChevronRight size={14} />
        </div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          {currentTitle}
        </h1>
      </div>

      {/* Right Actions & Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Demo Mode / Real Mode Badge & Switcher */}
        {isDemo ? (
          <button
            type="button"
            onClick={handleToggleDemoMode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="Click to toggle between Demo Mode and Real Production Mode"
          >
            <Sparkles size={13} color="#d97706" />
            <span>DEMO MODE ACTIVE</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleToggleDemoMode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--primary)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="Click to switch to Admin Demo Mode"
          >
            <Database size={13} />
            <span>Real Database Mode</span>
          </button>
        )}

        {/* Backend Status Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: healthStatus === 'online' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: healthStatus === 'online' ? '#16a34a' : '#ef4444',
            fontSize: '0.75rem',
            fontWeight: 600,
            border: healthStatus === 'online' ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
          }}
          title="Backend API Connectivity"
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: healthStatus === 'online' ? '#22c55e' : '#ef4444',
              display: 'inline-block',
            }}
          />
          <span>{healthStatus === 'online' ? 'API Online' : 'API Offline'}</span>
        </div>

        {/* Server Allowlist Badge */}
        {!isDemo && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: '#dc2626',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid rgba(220, 38, 38, 0.2)',
            }}
          >
            <Lock size={12} />
            <span>ADMIN_EMAILS Verified</span>
          </div>
        )}

        {/* Quick Broadcast Shortcut */}
        <Link
          to="/admin/alerts"
          className="btn btn-sm btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.35rem 0.75rem',
          }}
        >
          <Bell size={14} /> Broadcast
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Administrator Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isDemo
                ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                : 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: isDemo
                ? '0 2px 8px rgba(217, 119, 6, 0.3)'
                : '0 2px 8px rgba(220, 38, 38, 0.3)',
            }}
            title={isDemo ? 'Faculty Administrator (Demo Mode)' : (profile?.email || 'Administrator')}
          >
            {isDemo ? 'FA' : (profile?.name ? profile.name.charAt(0).toUpperCase() : 'A')}
          </div>
        </div>
      </div>
    </header>
  );
}
