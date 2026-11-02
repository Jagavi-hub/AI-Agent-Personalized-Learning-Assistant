import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sun, Moon, Bell, CheckCircle2, AlertCircle, Sparkles, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStudent } from '../context/StudentContext';
import { api } from '../services/api';
import NotificationCenter from './NotificationCenter';

const ROUTE_TITLES = {
  '/': 'Academic Dashboard',
  '/dashboard': 'Academic Dashboard',
  '/assistant': 'AI Learning Assistant',
  '/pdf-explainer': 'AI Explainer',
  '/my-learning': 'My Learning',
  '/learning': 'My Learning',
  '/quiz': 'Quiz & Practice',
  '/study-planner': 'Study Planner',
  '/recommendations': 'Recommendations',
  '/knowledge-base': 'Knowledge Base',
  '/analytics': 'Progress Analytics',
  '/progress': 'Progress Analytics',
  '/profile': 'Student Profile',
  '/settings': 'Settings',
  '/feedback': 'Feedback & Support',
  '/admin': 'Admin Console',
};

export default function Topbar({ onToggleMobileMenu }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { profile, logout } = useStudent();
  const [health, setHealth] = useState({ online: false, gemini: false });

  useEffect(() => {
    api.getHealth()
      .then((res) => {
        setHealth({ online: true, gemini: res.gemini_configured });
      })
      .catch(() => {
        setHealth({ online: false, gemini: false });
      });
  }, []);

  const pageTitle =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/pdf-explainer') ? 'AI Explainer' : 'LearnAI Platform');

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
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Title & Breadcrumbs + Mobile Menu Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle Navigation Menu"
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

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>LearnAI</span>
            <span>/</span>
            <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{pageTitle}</span>
          </div>
          <h1 style={{ fontSize: '1.25rem', marginTop: '0.1rem' }}>{pageTitle}</h1>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Backend & AI Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: health.online ? 'var(--success-light)' : 'var(--danger-light)',
            color: health.online ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
          title={health.online ? (health.gemini ? 'Gemini 1.5 Flash Connected' : 'Deterministic Academic Engine Active') : 'Backend Offline'}
        >
          {health.online ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>
            {health.online ? (health.gemini ? 'Gemini AI Online' : 'AI Agent Ready (Local)') : 'Backend Offline'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-surface-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-main)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* In-App Notifications Center */}
        <NotificationCenter />

        {/* Student Avatar button linking to Profile */}
        <Link
          to="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.35rem 0.75rem 0.35rem 0.35rem',
            borderRadius: '9999px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            textDecoration: 'none',
            color: 'var(--text-main)',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8125rem',
            }}
          >
            {profile?.name ? profile.name[0] : 'J'}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{profile?.name || 'Jagavi Raju'}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{profile?.year || '3rd Year'}</div>
          </div>
        </Link>

        {/* Sign Out Button */}
        <button
          onClick={() => logout()}
          style={{
            background: 'var(--bg-surface-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            padding: '0.45rem 0.75rem',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Sign Out of LearnAI"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
