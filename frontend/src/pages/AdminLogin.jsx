import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';
import { setAdminDemoMode } from '../services/api';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin, showNotification } = useStudent();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your institutional admin email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setAdminDemoMode(false);
      const res = await adminLogin(email.trim(), password);
      showNotification(`Welcome to LearnAI Admin Portal, ${res.student?.name || 'Administrator'}!`, 'success');
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Administrator authentication failed. Please check credentials or contact system admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthSuccess = (res) => {
    const isAdmin = res.student?.is_admin || res.student?.role === 'admin';
    if (isAdmin) {
      showNotification(`Welcome to LearnAI Admin Portal, ${res.student?.name || 'Administrator'}!`, 'success');
      navigate('/admin');
    } else {
      setError('Forbidden: This Google account is not authorized for administrator access. Please sign in via the Student Portal.');
    }
  };

  const handleEnterDemoMode = () => {
    setAdminDemoMode(true);
    showNotification('Switched to LearnAI Admin Demo Mode with isolated sample records.', 'info');
    navigate('/admin');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#090d16',
        color: '#f8fafc',
      }}
    >
      {/* Left Column: Security & Faculty Branding Panel */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #090d16 0%, #1c0b0e 50%, #2a0808 100%)',
          padding: '4rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(239, 68, 68, 0.15)',
        }}
        className="hide-mobile"
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', zIndex: 2 }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
            }}
          >
            <Shield size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Learn<span style={{ color: '#f87171' }}>AI</span> <span style={{ color: '#fca5a5', fontSize: '1rem', fontWeight: 600 }}>Admin Portal</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Institutional Management & Audit Console
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div style={{ maxWidth: '520px', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#fca5a5',
              marginBottom: '1.25rem',
            }}
          >
            <Lock size={14} />
            <span>Restricted Administrative Access</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.25, color: '#ffffff', marginBottom: '1.25rem' }}>
            Faculty & Platform Administration
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '2rem' }}>
            Centralized controls for student accounts, storage quotas, 30-day retention policies, support feedback, and real-time system monitoring.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#e2e8f0' }}>
              <CheckCircle2 size={18} color="#f87171" />
              <span>Server-side allowlist enforcement via <code>ADMIN_EMAILS</code></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#e2e8f0' }}>
              <CheckCircle2 size={18} color="#f87171" />
              <span>Full chronological audit trail of all consequential administrative actions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#e2e8f0' }}>
              <CheckCircle2 size={18} color="#f87171" />
              <span>Idempotent 30-day retention cleanup worker with safety dry-run mode</span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div
          style={{
            zIndex: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '1.5rem',
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: '#fca5a5', fontWeight: 600 }}>
            <AlertTriangle size={15} /> Security Policy Notice:
          </div>
          <div>All access attempts and administrative modifications are logged with actor timestamps.</div>
        </div>

        {/* Decorative background logo */}
        <div
          style={{
            position: 'absolute',
            right: '-80px',
            bottom: '-80px',
            opacity: 0.05,
            pointerEvents: 'none',
          }}
        >
          <Shield size={450} color="#dc2626" />
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2.5rem',
          maxWidth: '560px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.85rem',
              }}
            >
              <Shield size={14} />
              <span>Institutional Sign In</span>
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              Admin Portal Sign In
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.5 }}>
              Authorized faculty, department coordinators, and system administrators only.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ color: '#cbd5e1' }}>Institutional Admin Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="admin@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ color: '#cbd5e1' }}>Admin Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-lg"
              style={{
                width: '100%',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: '#dc2626',
                borderColor: '#b91c1c',
                color: '#ffffff',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <Shield size={18} />
              <span>{loading ? 'Authenticating Admin...' : 'Sign In as Administrator'}</span>
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.25rem 0',
              color: '#94a3b8',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
            <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          </div>

          {/* Continue with Google Button */}
          <GoogleSignInButton
            onSuccess={handleGoogleAuthSuccess}
            onError={(msg) => setError(msg)}
            buttonText="Continue with Google"
            portalType="admin"
          />

          {/* Instant Evaluation / Demo Mode Divider & Action */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              margin: '1.25rem 0 0.85rem 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Instant Faculty Evaluation
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          </div>

          <button
            type="button"
            onClick={handleEnterDemoMode}
            className="btn btn-lg"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.25)';
              e.currentTarget.style.borderColor = '#f59e0b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            }}
          >
            <Sparkles size={18} color="#f59e0b" />
            <span>Enter Admin Demo Mode (Instant Preview)</span>
          </button>
          <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            No password required • Populated with 14 student accounts & realistic storage states
          </div>

          {/* Return to Student Portal Link */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#94a3b8',
                fontSize: '0.875rem',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <ArrowLeft size={16} /> Return to Student Sign In
            </Link>
          </div>

          {/* Server-Side Allowlist Info Box */}
          <div
            style={{
              marginTop: '2.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.8rem',
              color: '#94a3b8',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.25rem' }}>
              <Lock size={14} /> Server-Side Role Enforcement
            </div>
            <div>
              Only email addresses verified in the backend <code style={{ color: '#f87171' }}>ADMIN_EMAILS</code> allowlist may authenticate. Student accounts receive HTTP 403 Forbidden.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
