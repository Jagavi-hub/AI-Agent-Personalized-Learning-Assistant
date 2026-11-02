import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function GoogleSignInButton({
  onSuccess,
  onError,
  buttonText = 'Continue with Google',
  portalType = 'student', // 'student' | 'admin'
  style = {}
}) {
  const { googleAuth, adminGoogleAuth } = useStudent();
  const [googleClientId, setGoogleClientId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 1. Resolve Google Client ID from Vite environment or backend auth config
  useEffect(() => {
    const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID || '').trim();
    if (envClientId) {
      setGoogleClientId(envClientId);
      setIsConfigured(true);
      return;
    }

    api.getAuthConfig()
      .then((cfg) => {
        const id = (cfg?.google_client_id || '').trim();
        if (id) {
          setGoogleClientId(id);
          setIsConfigured(true);
        } else {
          setIsConfigured(false);
        }
      })
      .catch(() => {
        setIsConfigured(false);
      });
  }, []);

  // 2. Ensure Google Identity Services script is loaded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.accounts) return;
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // 3. Handle Token Response
  const handleAuthToken = useCallback(async (token) => {
    if (!token) {
      if (onError) onError('No credential received from Google.');
      return;
    }

    try {
      setLoading(true);
      const authFn = portalType === 'admin' && typeof adminGoogleAuth === 'function' ? adminGoogleAuth : googleAuth;
      const res = await authFn(token);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      if (onError) onError(err.message || 'Google authentication failed on server.');
    } finally {
      setLoading(false);
    }
  }, [portalType, adminGoogleAuth, googleAuth, onSuccess, onError]);

  // 4. Click Handler: Initiates Real Google OAuth Popup
  const handleClick = () => {
    if (!isConfigured || !googleClientId) {
      setShowSetupModal(true);
      return;
    }

    // Flow A: Google OAuth2 Token Client (opens real account picker popup without iframe restrictions)
    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              if (onError) onError(`Google sign-in error: ${tokenResponse.error_description || tokenResponse.error}`);
              return;
            }
            if (tokenResponse.access_token) {
              await handleAuthToken(tokenResponse.access_token);
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('[Google OAuth2 Token Client error, attempting One Tap fallback]', err);
      }
    }

    // Flow B: Google Identity Services ID Token (One Tap / Credential fallback)
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp) => {
          if (resp?.credential) {
            handleAuthToken(resp.credential);
          }
        },
        auto_select: false,
      });
      window.google.accounts.id.prompt();
      return;
    }

    // Flow C: Retry if script is still loading
    setTimeout(() => {
      if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
        handleClick();
      } else {
        setShowSetupModal(true);
      }
    }, 500);
  };

  const isAdmin = portalType === 'admin';

  // High-contrast, clean button styling
  const buttonStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: isAdmin ? '0.75rem 1.25rem' : '0.65rem 1rem',
    borderRadius: isAdmin ? '8px' : 'var(--radius-md)',
    border: isAdmin
      ? isHovered ? '1px solid #cbd5e1' : '1px solid #e2e8f0'
      : '1px solid var(--border)',
    backgroundColor: isAdmin
      ? isHovered ? '#f8fafc' : '#ffffff'
      : isHovered ? 'var(--bg-hover)' : 'var(--bg-surface)',
    color: isAdmin ? '#1e293b' : 'var(--text-main)',
    fontSize: isAdmin ? '0.925rem' : '0.875rem',
    fontWeight: isAdmin ? 600 : 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    boxShadow: isAdmin
      ? isHovered ? '0 4px 12px rgba(0, 0, 0, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.15)'
      : 'none',
    transition: 'all 0.15s ease',
    outline: 'none',
    ...style,
  };

  return (
    <>
      <div style={{ width: '100%', position: 'relative' }}>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          style={buttonStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {loading ? (
            <>
              <RefreshCw size={18} className="spin" color={isAdmin ? '#1e293b' : 'currentColor'} />
              <span>Verifying Google account...</span>
            </>
          ) : (
            <>
              {/* Google 4-Color Official Logo */}
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
              <span>{buttonText}</span>
            </>
          )}
        </button>
      </div>

      {/* Setup Guide Modal if client ID unconfigured */}
      {showSetupModal && (
        <div className="modal-backdrop">
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(66, 133, 244, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
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
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Google Sign-In Configuration</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Setup required for live OAuth 2.0 tokens</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              <p style={{ marginTop: 0 }}>
                Live Google Sign-In is built into LearnAI for both students and administrators. To enable it:
              </p>

              <ol style={{ paddingLeft: '1.25rem', margin: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <li>
                  Open <strong>Google Cloud Console</strong> &gt; <em>APIs &amp; Services</em> &gt; <em>Credentials</em>.
                </li>
                <li>
                  Create an <strong>OAuth 2.0 Client ID</strong> (Application type: <em>Web application</em>).
                </li>
                <li>
                  Set <strong>Authorized JavaScript origins</strong> to:
                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.35rem 0.65rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    http://localhost:5173, http://127.0.0.1:5173
                  </div>
                </li>
                <li>
                  Add your Client ID to your project's <code>.env</code> file:
                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.35rem 0.65rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    GOOGLE_CLIENT_ID=&lt;your-client-id&gt;.apps.googleusercontent.com
                  </div>
                </li>
                <li>Restart the backend and frontend servers.</li>
              </ol>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Tip:</strong> Email &amp; password sign-in and one-click demo accounts remain fully operational right now.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="btn btn-primary btn-sm"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
