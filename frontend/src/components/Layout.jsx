import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useStudent } from '../context/StudentContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Layout() {
  const { notification } = useStudent();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />

        {/* Global Toast Notification */}
        {notification && (
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
              zIndex: 100,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {notification.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
            {notification.type === 'error' && <AlertCircle size={18} color="var(--danger)" />}
            {notification.type === 'info' && <Info size={18} color="var(--primary)" />}
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
              {notification.message}
            </span>
          </div>
        )}

        <main className="page-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
