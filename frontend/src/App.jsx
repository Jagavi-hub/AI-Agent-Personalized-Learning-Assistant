import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { StudentProvider, useStudent } from './context/StudentContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { isAdminDemoMode } from './services/api';

// Student Portal Pages
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import MyLearning from './pages/MyLearning';
import QuizPractice from './pages/QuizPractice';
import StudyPlanner from './pages/StudyPlanner';
import Recommendations from './pages/Recommendations';
import KnowledgeBase from './pages/KnowledgeBase';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import FeedbackSupport from './pages/FeedbackSupport';
import PdfExplainer from './pages/PdfExplainer';

// Authentication Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import AdminLogin from './pages/AdminLogin';

// Independent Admin Portal Shell & Dedicated Pages
import AdminLayout from './components/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminStorage from './pages/admin/AdminStorage';
import AdminAlerts from './pages/admin/AdminAlerts';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminSystemHealth from './pages/admin/AdminSystemHealth';
import AdminAudit from './pages/admin/AdminAudit';
import AdminSettings from './pages/admin/AdminSettings';

function ProtectedRoute({ children, requireOnboarded = true }) {
  const { isAuthenticated, isOnboarded, profile, loading } = useStudent();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-main)',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
          Verifying LearnAI session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Administrators viewing the student portal bypass onboarding
  if (requireOnboarded && !isOnboarded && !profile?.is_admin && profile?.role !== 'admin') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isOnboarded, profile, loading } = useStudent();

  if (loading) return null;

  if (isAuthenticated) {
    if (profile?.is_admin || profile?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (!isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { profile, isAuthenticated, loading } = useStudent();

  if (loading) return null;

  // Authenticated non-admin students are strictly forbidden from administrative portal
  if (isAuthenticated && !profile?.is_admin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Permit evaluation & testing in isolated Admin Demo Sandbox for guests/evaluators
  if (isAdminDemoMode()) {
    return children;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!profile?.is_admin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <StudentProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Student Authentication Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />

            {/* Dedicated Admin Portal Authentication */}
            <Route
              path="/admin/login"
              element={
                <PublicRoute>
                  <AdminLogin />
                </PublicRoute>
              }
            />

            {/* Student Onboarding Route */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireOnboarded={false}>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* 1. STUDENT PORTAL — Dedicated Student Layout & Protected Learning Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Layout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="pdf-explainer" element={<PdfExplainer />} />
              <Route path="pdf-explainer/:documentId" element={<PdfExplainer />} />
              <Route path="my-learning" element={<MyLearning />} />
              <Route path="learning" element={<MyLearning />} />
              <Route path="quiz" element={<QuizPractice />} />
              <Route path="study-planner" element={<StudyPlanner />} />
              <Route path="recommendations" element={<Recommendations />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="progress" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="feedback" element={<FeedbackSupport />} />
              <Route path="support" element={<Navigate to="/feedback" replace />} />
              <Route path="feedback-support" element={<Navigate to="/feedback" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* 2. ADMIN PORTAL — Independent Administrative Shell & Management Sub-Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <ErrorBoundary>
                    <AdminLayout />
                  </ErrorBoundary>
                </AdminRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:userId" element={<AdminUserDetail />} />
              <Route path="storage" element={<AdminStorage />} />
              <Route path="alerts" element={<AdminAlerts />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="system-health" element={<AdminSystemHealth />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </StudentProvider>
    </ThemeProvider>
  );
}
