import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { CheckCircle2, AlertCircle, Info, RotateCcw, LogOut, Sparkles } from 'lucide-react';
import { isAdminDemoMode, setAdminDemoMode, adminDemoStore } from '../../services/api';

export default function AdminLayout() {
  const [toast, setToast] = useState(null);
  const [isDemo, setIsDemo] = useState(() => isAdminDemoMode());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleModeChange = (e) => {
      setIsDemo(!!e.detail?.enabled);
    };
    window.addEventListener('learnai_admin_demo_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('learnai_admin_demo_mode_changed', handleModeChange);
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleResetDemoData = () => {
    adminDemoStore.reset();
    showToast('Demo records reset to default sample dataset.', 'info');
    // Force a fast re-render across active routes
    window.dispatchEvent(new CustomEvent('learnai_admin_demo_mode_changed', { detail: { enabled: true } }));
    window.location.reload();
  };

  const handleExitDemoMode = () => {
    setAdminDemoMode(false);
    showToast('Exited Demo Mode. Real database mode active.', 'info');
    navigate('/admin/login');
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-app)' }}>
      <AdminSidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AdminTopbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

        {/* Demo Mode Persistent Banner */}
        {isDemo && (
          <div
            style={{
              backgroundColor: '#92400e',
              background: 'linear-gradient(90deg, #9a3412 0%, #b45309 35%, #d97706 70%, #9a3412 100%)',
              color: '#ffffff',
              padding: '0.6rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(180, 83, 9, 0.3)',
              borderBottom: '1px solid rgba(251, 191, 36, 0.35)',
              zIndex: 35,
              fontSize: '0.85rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 600 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '0.8rem',
                }}
              >
                🔶
              </span>
              <span>
                <strong>DEMO MODE ACTIVE:</strong> Showing isolated faculty & student records. Mutations operate in-session and will <span style={{ textDecoration: 'underline' }}>NOT</span> modify <code>learnai.db</code>.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleResetDemoData}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.28)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  color: '#ffffff',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'background 0.15s',
                }}
                title="Reset demo records to initial fictional state"
              >
                <RotateCcw size={13} /> Reset Demo Data
              </button>

              <button
                type="button"
                onClick={handleExitDemoMode}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  color: '#9a3412',
                  padding: '0.3rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                  transition: 'opacity 0.15s',
                }}
                title="Exit Demo Mode and return to real administrator login"
              >
                <LogOut size={13} /> Exit Demo Mode
              </button>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {toast.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
            {toast.type === 'error' && <AlertCircle size={18} color="var(--danger)" />}
            {toast.type === 'danger' && <AlertCircle size={18} color="var(--danger)" />}
            {toast.type === 'info' && <Info size={18} color="var(--primary)" />}
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
              {toast.message}
            </span>
          </div>
        )}

        <main
          className="admin-page-wrapper"
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          <Outlet context={{ showToast, isDemo }} />
        </main>
      </div>
    </div>
  );
}
