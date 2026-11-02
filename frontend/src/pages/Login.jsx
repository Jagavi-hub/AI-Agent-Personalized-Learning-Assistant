import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BrainCircuit,
  Eye,
  EyeOff,
  ShieldCheck,
  GraduationCap,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, showNotification } = useStudent();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If ?admin=true is present in query, cleanly forward to dedicated Admin Login
  useEffect(() => {
    if (searchParams.get('admin') === 'true') {
      navigate('/admin/login', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await login(email.trim(), password);
      showNotification(`Welcome back, ${res.student.name}!`, 'success');
      if (!res.is_onboarded) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (res) => {
    const isAdmin = res.student?.is_admin || res.student?.role === 'admin';
    if (isAdmin) {
      showNotification(`Welcome to LearnAI Admin Console, ${res.student?.name || 'Administrator'}!`, 'success');
      navigate('/admin');
    } else {
      showNotification(`Welcome back, ${res.student?.name}!`, 'success');
      if (!res.is_onboarded) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* Left Branding Panel (Desktop Only) */}
      <div
        className="hide-mobile"
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          color: '#ffffff',
          padding: '3.5rem 3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
            }}
          >
            <BrainCircuit size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Learn<span style={{ color: '#818cf8' }}>AI</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Higher Education Learning Platform
            </div>
          </div>
        </div>

        {/* Headline, Description & 2 Feature Highlights */}
        <div style={{ maxWidth: '480px' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.25, color: '#ffffff', marginBottom: '1rem' }}>
            Your learning journey, personalized.
          </h2>

          <p style={{ fontSize: '1rem', color: '#c7d2fe', lineHeight: 1.6, marginBottom: '2rem' }}>
            Learn at your pace with an AI learning assistant grounded in your university curriculum.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#e0e7ff' }}>
              <ShieldCheck size={18} color="#818cf8" style={{ flexShrink: 0 }} />
              <span>Grounded in course lecture notes with authentic RAG citations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#e0e7ff' }}>
              <GraduationCap size={18} color="#818cf8" style={{ flexShrink: 0 }} />
              <span>Diagnostic quiz scoring with transparent mastery tracking</span>
            </div>
          </div>
        </div>

        {/* Project Team Credits */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '1.25rem',
            fontSize: '0.78rem',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem', color: '#c7d2fe', fontWeight: 500 }}>
            <Users size={14} /> Project Team — AI&DS Department:
          </div>
          <div>Hemalatha A • Diya S • Jagavi R</div>
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
          padding: '2.5rem 1.5rem',
          maxWidth: '560px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Mobile Brand Header (Visible only when left panel is hidden) */}
          <div className="hide-desktop" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BrainCircuit size={20} color="#ffffff" />
              </div>
              <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                Learn<span style={{ color: '#818cf8' }}>AI</span>
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              Higher Education Learning Platform
            </div>
          </div>

          {/* 1. Welcome heading and short description */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', margin: 0 }}>
              Sign in to continue your learning journey.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 2. Email address field */}
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* 3. Password field with show/hide functionality */}
            <div className="input-group" style={{ marginBottom: '0.5rem' }}>
              <label className="input-label" htmlFor="login-password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '2.5rem' }}
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
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 4. Forgot Password link */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>

            {/* 5. Primary Sign In button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 600,
              }}
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          {/* 6. Subtle divider labelled "OR" */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.25rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span style={{ padding: '0 0.85rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>

          {/* 7. Continue with Google button */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg)}
            buttonText="Continue with Google"
            portalType="student"
          />

          {/* 8. Create an Account link */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Create an Account
            </Link>
          </div>

          {/* 9. Discreet Faculty or Administrator Login option */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border)',
              textAlign: 'center',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Faculty or Administrator? </span>
            <Link
              to="/admin/login"
              style={{
                color: 'var(--text-main)',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginLeft: '0.25rem',
              }}
            >
              <span>Faculty / Admin Sign In</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
