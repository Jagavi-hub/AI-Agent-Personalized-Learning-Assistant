import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sun, Moon, Bell, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStudent } from '../context/StudentContext';
import { api } from '../services/api';

const ROUTE_TITLES = {
  '/': 'Academic Dashboard',
  '/assistant': 'AI Learning Assistant & Agent',
  '/my-learning': 'My Learning & Curriculum',
  '/quiz': 'Quiz & Adaptive Practice',
  '/recommendations': 'Personalized Recommendations',
  '/knowledge-base': 'Knowledge Base & Retrieval (RAG)',
  '/analytics': 'Progress Analytics & Mastery',
  '/profile': 'Student Profile',
  '/settings': 'System Settings',
};

export default function Topbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { profile } = useStudent();
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

  const pageTitle = ROUTE_TITLES[location.pathname] || 'LearnAI Platform';

  return (
    <header
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
      {/* Title & Breadcrumbs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>LearnAI</span>
          <span>/</span>
          <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{pageTitle}</span>
        </div>
        <h1 style={{ fontSize: '1.25rem', marginTop: '0.1rem' }}>{pageTitle}</h1>
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

        {/* Notifications Icon */}
        <Link
          to="/recommendations"
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
            position: 'relative',
            textDecoration: 'none',
          }}
          title="Review Active Recommendations"
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '7px',
              right: '7px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--primary)',
              borderRadius: '50%',
            }}
          />
        </Link>

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
      </div>
    </header>
  );
}
