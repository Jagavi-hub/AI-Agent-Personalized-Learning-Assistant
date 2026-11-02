import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HardDrive,
  Bell,
  MessageSquare,
  Activity,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';
import { isAdminDemoMode, setAdminDemoMode } from '../../services/api';

const ADMIN_NAV_ITEMS = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Student Accounts', icon: Users },
  { path: '/admin/storage', label: 'Storage & Quotas', icon: HardDrive },
  { path: '/admin/alerts', label: 'Alerts & Broadcasts', icon: Bell },
  { path: '/admin/feedback', label: 'Feedback & Support', icon: MessageSquare },
  { path: '/admin/system-health', label: 'System Health', icon: Activity },
  { path: '/admin/audit', label: 'Audit Log', icon: FileText },
  { path: '/admin/settings', label: 'Admin Settings', icon: Sliders },
];

export default function AdminSidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDemo, setIsDemo] = useState(() => isAdminDemoMode());
  const { profile, logout } = useStudent();
  const navigate = useNavigate();
  const location = useLocation();

  // Automatically close mobile drawer when navigation route changes
  useEffect(() => {
    if (mobileOpen && setMobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const handleModeChange = (e) => {
      setIsDemo(!!e.detail?.enabled);
    };
    window.addEventListener('learnai_admin_demo_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('learnai_admin_demo_mode_changed', handleModeChange);
    };
  }, []);

  const handleLogout = async () => {
    if (isDemo) {
      setAdminDemoMode(false);
      navigate('/admin/login');
      return;
    }
    await logout();
    navigate('/admin/login');
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen && setMobileOpen(false)}
          aria-label="Close admin menu backdrop"
        />
      )}
      <aside
        className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: collapsed ? '72px' : '260px',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: isDemo
                ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDemo
                ? '0 4px 12px rgba(217, 119, 6, 0.4)'
                : '0 4px 12px rgba(220, 38, 38, 0.4)',
              flexShrink: 0,
            }}
          >
            <Shield size={22} color="#ffffff" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: '800', fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                Learn<span style={{ color: isDemo ? '#fbbf24' : '#f87171' }}>AI</span> {isDemo ? 'Demo' : 'Admin'}
              </div>
              <div style={{ fontSize: '0.65rem', color: isDemo ? '#fde68a' : '#fca5a5', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                {isDemo ? 'Isolated Preview Mode' : 'Faculty Control Console'}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: collapsed ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          overflowY: 'auto',
        }}
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setMobileOpen && setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: collapsed ? '0.75rem 0' : '0.65rem 0.85rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '8px',
                color: isActive ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                border: isActive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={19} style={{ flexShrink: 0, color: '#f87171' }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Portal Switcher & User Footer */}
      <div
        style={{
          padding: '0.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Switch to Student Portal */}
        <NavLink
          to="/dashboard"
          title={collapsed ? 'Switch to Student Portal' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: collapsed ? '0.75rem 0' : '0.6rem 0.85rem',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#c7d2fe',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'background-color 0.15s',
          }}
        >
          <GraduationCap size={18} style={{ flexShrink: 0, color: '#818cf8' }} />
          {!collapsed && <span>Student Portal</span>}
        </NavLink>

        {/* Admin Identity & Logout */}
        {!collapsed ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.6rem',
              borderRadius: '8px',
              backgroundColor: isDemo ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
              border: isDemo ? '1px solid rgba(245, 158, 11, 0.25)' : 'none',
            }}
          >
            <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {isDemo ? 'Faculty Admin (Demo)' : (profile?.name || 'Administrator')}
              </div>
              <div style={{ fontSize: '0.7rem', color: isDemo ? '#fbbf24' : '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {isDemo ? 'faculty.admin@example.com' : profile?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDemo ? '#fbbf24' : '#f87171',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isDemo ? 'Exit Admin Demo Mode' : 'Sign Out of Admin Console'}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDemo ? '#fbbf24' : '#f87171',
              cursor: 'pointer',
              padding: '0.75rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            title={isDemo ? 'Exit Admin Demo Mode' : 'Sign Out of Admin Console'}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
