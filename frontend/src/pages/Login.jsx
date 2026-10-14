import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Users,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, googleAuth, showNotification } = useStudent();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (demoEmail, demoName) => {
    try {
      setLoading(true);
      setError('');
      setEmail(demoEmail);
      setPassword('LearnAI2026Secure');
      const res = await login(demoEmail, 'LearnAI2026Secure');
      showNotification(`Signed in as ${demoName} (AI&DS 3rd Year)`, 'success');
      navigate('/dashboard');
    } catch (err) {
      setError('Demo login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    showNotification(
      'Google OAuth: To enable live Google tokens, supply your GOOGLE_CLIENT_ID in .env. Email & password sign-in is fully operational.',
      'info'
    );
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
      {/* Two-Column Layout: Left Branding Panel (Desktop Only) */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          color: '#ffffff',
          padding: '4rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="hide-mobile"
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', zIndex: 2 }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
            }}
          >
            <BrainCircuit size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Learn<span style={{ color: '#818cf8' }}>AI</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Higher Education Learning Platform
            </div>
          </div>
        </div>

        {/* Headline & Description */}
        <div style={{ maxWidth: '520px', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#c7d2fe',
              marginBottom: '1.25rem',
            }}
          >
            <Sparkles size={14} color="#a5b4fc" />
            <span>Autonomous Pedagogical AI Agent</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, color: '#ffffff', marginBottom: '1.25rem' }}>
            Your learning journey, personalized.
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#c7d2fe', lineHeight: 1.6, marginBottom: '2rem' }}>
            Learn at your pace. Understand your strengths. Improve with your personal AI learning assistant.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#e0e7ff' }}>
              <ShieldCheck size={18} color="#818cf8" />
              <span>Grounded in actual course lecture notes with authentic RAG citations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#e0e7ff' }}>
              <GraduationCap size={18} color="#818cf8" />
              <span>Diagnostic quiz scoring on backend with transparent mastery rules</span>
            </div>
          </div>
        </div>

        {/* Project Team Credits */}
        <div
          style={{
            zIndex: 2,
            borderTop: '1px solid rgba(255,255,255,0.12)',
            paddingTop: '1.5rem',
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: '#c7d2fe', fontWeight: 600 }}>
            <Users size={15} /> Project Team — AI&DS Department, 3rd Year:
          </div>
          <div>Hemalatha A • Diya S • Jagavi R</div>
        </div>

        {/* Decorative background element */}
        <div
          style={{
            position: 'absolute',
            right: '-60px',
            bottom: '-60px',
            opacity: 0.08,
            pointerEvents: 'none',
          }}
        >
          <BrainCircuit size={400} color="#ffffff" />
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
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
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
                marginBottom: '1.5rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email address</label>
              <input
                type="email"
                className="input-field"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.5rem 0',
              color: 'var(--text-light)',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span style={{ padding: '0 0.75rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Quick Demo Sign-In Box for Evaluator convenience */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              Academic Prototype 1-Click Demo Accounts:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleDemoSignIn('jagavi.raju@university.edu', 'Jagavi R')}
                className="btn btn-sm btn-primary"
                style={{ fontSize: '0.75rem' }}
              >
                Jagavi R (AI&DS)
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('hemalatha.a@university.edu', 'Hemalatha A')}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem' }}
              >
                Hemalatha A
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('diya.s@university.edu', 'Diya S')}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem' }}
              >
                Diya S
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
