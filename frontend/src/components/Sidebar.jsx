import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  GraduationCap,
  Compass,
  FileText,
  BarChart3,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Calendar,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assistant', label: 'AI Learning Assistant', icon: Sparkles, badge: 'Agent' },
  { path: '/my-learning', label: 'My Learning', icon: BookOpen },
  { path: '/quiz', label: 'Quiz & Practice', icon: GraduationCap },
  { path: '/study-planner', label: 'Study Planner', icon: Calendar },
  { path: '/recommendations', label: 'Recommendations', icon: Compass },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: FileText },
  { path: '/analytics', label: 'Progress Analytics', icon: BarChart3 },
  { path: '/profile', label: 'Student Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useStudent();

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        backgroundColor: 'var(--bg-sidebar)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.4)',
              flexShrink: 0,
            }}
          >
            <BrainCircuit size={22} color="#ffffff" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                Learn<span style={{ color: '#818cf8' }}>AI</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Higher Ed Agent
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

      {/* Nav List */}
      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          overflowY: 'auto',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: collapsed ? '0.75rem 0' : '0.65rem 0.85rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '8px',
                color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                backgroundColor: isActive ? 'var(--sidebar-item-active)' : 'transparent',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={19} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '9999px',
                        color: '#ffffff',
                        fontWeight: 600,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle for Collapsed state */}
      {collapsed && (
        <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: '#1e293b',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Student Profile Quick Tile */}
      {!collapsed && profile && (
        <div
          style={{
            padding: '1rem',
            margin: '0.75rem',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: '#ffffff',
              }}
            >
              {profile.name ? profile.name[0] : 'S'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {profile.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {profile.year} • {profile.current_skill_level}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
