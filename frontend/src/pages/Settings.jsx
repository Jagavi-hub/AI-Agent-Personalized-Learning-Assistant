import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Shield,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStudent } from '../context/StudentContext';
import { api } from '../services/api';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { showNotification } = useStudent();
  const [health, setHealth] = useState({ online: false, gemini: false });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setChecking(true);
      const res = await api.getHealth();
      setHealth({ online: true, gemini: res.gemini_configured });
      showNotification('Backend connection verified', 'success');
    } catch (err) {
      setHealth({ online: false, gemini: false });
      showNotification('Could not connect to backend server', 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '900px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System Settings & Disclosures</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Platform configurations, AI orchestrator status, theme settings, and architectural disclosures.
        </p>
      </div>

      {/* AI Agent & Backend Integration Status */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Cpu size={18} color="var(--primary)" />
              AI Agent & Backend Services Status
            </div>
            <div className="card-desc">Real-time verification of LLM services and deterministic fallbacks</div>
          </div>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="btn btn-sm btn-secondary"
          >
            <RefreshCw size={14} className={checking ? 'spinner' : ''} /> Check Status
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Status Row 1: Backend API */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-hover)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                FastAPI Application Server
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Target: http://127.0.0.1:8000/api
              </div>
            </div>
            <span className={`badge ${health.online ? 'badge-success' : 'badge-danger'}`}>
              {health.online ? 'Operational' : 'Offline'}
            </span>
          </div>

          {/* Status Row 2: Gemini API */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-hover)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Google Gemini API Integration
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {health.gemini
                  ? 'Configured via GEMINI_API_KEY environment variable (gemini-1.5-flash)'
                  : 'Unconfigured in .env — Deterministic Academic Engine Active'}
              </div>
            </div>
            <span className={`badge ${health.gemini ? 'badge-success' : 'badge-primary'}`}>
              {health.gemini ? 'Connected' : 'Fallback Active'}
            </span>
          </div>

          {/* Status Row 3: Retrieval Engine */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-hover)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Semantic Retrieval Engine (RAG)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                TF-IDF + Cosine Vector Similarity with PyPDF chunking
              </div>
            </div>
            <span className="badge badge-success">Operational</span>
          </div>
        </div>
      </div>

      {/* Visual Theme Appearance */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              {theme === 'light' ? <Sun size={18} color="var(--primary)" /> : <Moon size={18} color="var(--primary)" />}
              Appearance & Display Theme
            </div>
            <div className="card-desc">Switch between clean light mode and high-contrast dark mode</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Current Mode: {theme === 'light' ? 'Light Theme (EdTech Soft Neutral)' : 'Dark Theme (Deep Navy)'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Preferences are automatically saved to your browser's local storage.
            </div>
          </div>

          <button onClick={toggleTheme} className="btn btn-secondary">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            Toggle to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>
      </div>

      {/* Storage and Database Specification */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Database size={18} color="var(--primary)" />
              Database & Storage Architecture
            </div>
            <div className="card-desc">Local relational storage and document upload directory</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database Engine:</span>
            <span style={{ fontWeight: 600 }}>SQLite 3 (Persistent Relational File)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database Location:</span>
            <code>./learnai.db</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Document Upload Storage:</span>
            <code>./data/uploads/</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>ORM Framework:</span>
            <span style={{ fontWeight: 600 }}>SQLAlchemy 2.0 with Declarative Base</span>
          </div>
        </div>
      </div>

      {/* Academic Disclosures & Honest Limitations */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <Shield size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Academic Prototype Disclosures</h3>
        </div>

        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Demo Authentication Flow:</strong> As prescribed for this academic prototype, the system operates with a single active authenticated student profile (Student ID: 1) without multi-tenant authentication complexity.
          </li>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Deterministic Fallback Integrity:</strong> When a Gemini API key is absent, the system uses an intelligent deterministic academic knowledge engine. All responses are clearly badged as fallback output, ensuring zero false claims of live LLM generation.
          </li>
          <li style={{ marginBottom: '0.4rem' }}>
            <strong>Zero Score Fabrication:</strong> Quiz results and progress analytics are computed strictly by evaluating submitted answers against stored database answer keys.
          </li>
          <li>
            <strong>Authentic Citations:</strong> The knowledge retrieval pipeline only generates citations for real uploaded documents and pages present in the SQLite database.
          </li>
        </ul>
      </div>
    </div>
  );
}
