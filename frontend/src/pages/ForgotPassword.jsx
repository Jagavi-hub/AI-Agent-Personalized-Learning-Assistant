import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showNotification } = useStudent();

  const [step, setStep] = useState(1); // 1: request token, 2: reset password
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devTokenMsg, setDevTokenMsg] = useState('');
  const [error, setError] = useState('');

  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setError('');
      const res = await api.forgotPassword(email.trim());
      if (res.dev_token) {
        setToken(res.dev_token);
        setDevTokenMsg(`Development Demo Token: "${res.dev_token}" (Auto-filled below)`);
      }
      setStep(2);
      showNotification('Reset token generated. Please enter your new password.', 'info');
    } catch (err) {
      setError(err.message || 'Failed to request reset token.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!token.trim() || !newPassword) {
      setError('Token and new password are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.resetPassword(token.trim(), newPassword);
      showNotification('Password reset successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '2.5rem',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <KeyRound size={22} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            {step === 1 ? 'Password Recovery' : 'Set New Password'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {step === 1
              ? 'Enter your registered university email to receive a secure reset token.'
              : 'Enter the verification token and your new password.'}
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

        {devTokenMsg && (
          <div
            style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              border: '1px solid var(--primary-border)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              marginBottom: '1.5rem',
            }}
          >
            {devTokenMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestToken} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Registered Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              {loading ? 'Generating Token...' : 'Generate Reset Token'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Reset Token</label>
              <input
                type="text"
                className="input-field"
                placeholder="Paste token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">New Password (Min 6 chars)</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              {loading ? 'Updating Password...' : 'Update Password & Sign In'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--primary)',
              fontSize: '0.875rem',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={15} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
