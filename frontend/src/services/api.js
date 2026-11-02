import { adminDemoStore } from './adminDemoData';

export { adminDemoStore };

export function isAdminDemoMode() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('learnai_admin_demo_mode') === 'true';
}

export function setAdminDemoMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    sessionStorage.setItem('learnai_admin_demo_mode', 'true');
  } else {
    sessionStorage.removeItem('learnai_admin_demo_mode');
  }
  window.dispatchEvent(
    new CustomEvent('learnai_admin_demo_mode_changed', { detail: { enabled: !!enabled } })
  );
}

const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('learnai_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('learnai_token', token);
  } else {
    localStorage.removeItem('learnai_token');
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, let browser set multipart boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(url, config);

    if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/admin/login' && endpoint !== '/auth/register') {
      // Token expired or invalid
      setStoredToken(null);
    }

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch (_) {
        // fallback
      }

      if (res.status === 403 && typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('suspended')) {
        setStoredToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('learnai_account_suspended', { detail: { message: errorMsg } })
          );
        }
      }

      throw new Error(errorMsg);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => request('/health'),

  // Authentication
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  adminLogin: (data) => request('/auth/admin/login', { method: 'POST', body: JSON.stringify(data) }),
  googleAuth: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  adminGoogleAuth: (credential) => request('/auth/admin/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  getAuthConfig: () => request('/auth/config'),
  getMe: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, new_password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
  logout: () => {
    setStoredToken(null);
    return request('/auth/logout', { method: 'POST' }).catch(() => {});
  },

  // Student Onboarding & Profile
  completeOnboarding: (data) => request('/student/onboarding', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request('/student/profile'),
  updateProfile: (data) => request('/student/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Subjects & Curriculum
  getSubjects: () => request('/subjects'),
  getCourses: () => request('/courses'),
  getCourseTopics: (courseId) => request(`/courses/${courseId}/topics`),

  // Learning Activities
  getActivities: () => request('/student/activities'),

  // AI Agent & Chat
  sendAgentMessage: (message, conversationId = null, actionOverride = null, subjectId = null) =>
    request('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        action_override: actionOverride,
        subject_id: subjectId,
      }),
    }),
  getConversations: () => request('/agent/conversations'),
  getConversationDetails: (id) => request(`/agent/conversations/${id}`),
  deleteConversation: (id) => request(`/agent/conversations/${id}`, { method: 'DELETE' }),

  // Quiz & Adaptive Practice
  generateQuiz: (topic, difficulty = 'Intermediate', numQuestions = 5, subjectId = null, documentId = null) =>
    request('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        difficulty,
        num_questions: numQuestions,
        subject_id: subjectId,
        document_id: documentId,
      }),
    }),
  getQuiz: (id) => request(`/quiz/${id}`),
  submitQuiz: (quizId, answers) =>
    request('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
      }),
    }),
  getQuizAttempts: () => request('/quiz/attempts/history'),
  getQuizReview: (attemptId) => request(`/quiz/attempts/${attemptId}/review`),
  explainQuizMistakes: (payload) =>
    request('/quiz/explain-mistakes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAttemptMistakeExplanations: (attemptId) => request(`/quiz/attempts/${attemptId}/explain-mistakes`),

  // Knowledge Base (RAG)
  getDocuments: () => request('/knowledge/documents'),
  uploadDocument: (formData) =>
    request('/knowledge/upload', {
      method: 'POST',
      body: formData,
    }),
  deleteDocument: (id) => request(`/knowledge/documents/${id}`, { method: 'DELETE' }),
  searchKnowledge: (query, topK = 3, subjectId = null) =>
    request('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK, subject_id: subjectId }),
    }),
  downloadDocumentFile: async (docId, filename) => {
    if (isAdminDemoMode()) {
      // In Demo Mode, simulate a realistic curriculum PDF download safely without backend 404
      const blob = new Blob(
        [
          `%PDF-1.4\n% LearnAI Demo Document: ${filename || 'Sample_Course_Material.pdf'}\n` +
          `Academic Curriculum Material Fixture generated for LearnAI Demo Mode.\n` +
          `File Reference ID: ${docId}\nTimestamp: ${new Date().toISOString()}\n%%EOF`
        ],
        { type: 'application/pdf' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `document_${docId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/knowledge/documents/${docId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to download file (${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `document_${docId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // AI PDF Explainer
  getPdfExplainerDocuments: () => request('/pdf-explainer/documents'),
  getPdfDocumentMetadata: (docId) => request(`/pdf-explainer/documents/${docId}`),
  getPdfOutline: (docId) => request(`/pdf-explainer/documents/${docId}/outline`),
  getPdfExplanation: (docId, mode = 'complete', topic = null) => {
    let url = `/pdf-explainer/documents/${docId}/explanation?mode=${mode}`;
    if (topic) url += `&topic=${encodeURIComponent(topic)}`;
    return request(url);
  },
  explainPdfDocument: (docId, mode = 'complete', topic = null, forceRegenerate = false) =>
    request(`/pdf-explainer/documents/${docId}/explain`, {
      method: 'POST',
      body: JSON.stringify({ mode, topic, force_regenerate: forceRegenerate }),
    }),
  askPdfQuestion: (docId, question) =>
    request(`/pdf-explainer/documents/${docId}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  viewPdfDocument: async (docId) => {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/pdf-explainer/documents/${docId}/view`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to open PDF (${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  },

  // Student Storage Quota
  getStudentStorage: () => request('/student/storage'),

  // Notifications
  getNotifications: (unreadOnly = false) => request(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  // Recommendations
  getRecommendations: () => request('/recommendations'),
  toggleRecommendation: (id, isCompleted) =>
    request(`/recommendations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: isCompleted }),
    }),
  getResourceRecommendations: () => request('/recommendations/resources'),

  // Personalized Study Planner (Module 8)
  getStudyPlans: () => request('/study-planner/plans'),
  generateStudyPlan: (data) =>
    request('/study-planner/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createStudyTask: (data) =>
    request('/study-planner/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStudyTask: (taskId, updates) =>
    request(`/study-planner/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteStudyTask: (taskId) =>
    request(`/study-planner/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // Learning Goals
  getGoals: () => request('/goals'),
  createGoal: (goal) => request('/goals', { method: 'POST', body: JSON.stringify(goal) }),
  updateGoal: (id, updates) => request(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  // Progress Analytics
  getProgressAnalytics: () => request('/analytics/progress'),

  // Feedback & Multi-Turn Threads
  submitFeedback: (feedback) => request('/feedback', { method: 'POST', body: JSON.stringify(feedback) }),
  getFeedback: () => request('/feedback'),
  getFeedbackThread: (id) => request(`/feedback/${id}`),
  replyToFeedback: (id, message) => request(`/feedback/${id}/reply`, { method: 'POST', body: JSON.stringify({ message }) }),
  updateStudentFeedbackStatus: (id, status) => request(`/feedback/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Admin Console Endpoints (with isolated Demo Mode routing)
  getAdminDashboardStats: () => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getDashboardStats();
    }
    return request('/admin/dashboard/stats');
  },
  getAdminUsers: (params = {}) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getUsers(params);
    }
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/users${qs ? '?' + qs : ''}`);
  },
  getAdminUserStorage: (userId) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getUserStorage(userId);
    }
    return request(`/admin/users/${userId}/storage`);
  },
  updateUserQuota: (userId, quotaMb) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.updateUserQuota(userId, quotaMb);
    }
    return request(`/admin/users/${userId}/quota`, {
      method: 'PUT',
      body: JSON.stringify({
        custom_quota_mb: quotaMb,
        quota_bytes: quotaMb * 1024 * 1024,
      }),
    });
  },
  getStorageWarnings: (statusFilter = 'active') => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getStorageWarnings(statusFilter);
    }
    return request(`/admin/storage/warnings${statusFilter ? '?status=' + statusFilter : ''}`);
  },
  previewCleanup: (studentId, graceDays = 30) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.previewCleanup(studentId, graceDays);
    }
    return request(`/admin/storage/cleanup/dry-run/${studentId}?grace_days=${graceDays}`);
  },
  executeCleanup: (studentId, graceDays = 30) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.executeCleanup(studentId, graceDays);
    }
    return request(`/admin/storage/cleanup/execute/${studentId}?grace_days=${graceDays}`, { method: 'POST' });
  },
  getCleanupLogs: () => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getCleanupLogs();
    }
    return request('/admin/storage/cleanup/logs');
  },
  getAdminFeedback: (statusFilter = null) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getFeedback(statusFilter);
    }
    return request(`/admin/feedback${statusFilter ? '?status=' + statusFilter : ''}`);
  },
  getAdminFeedbackThread: (id) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getFeedbackThread(id);
    }
    return request(`/admin/feedback/${id}`);
  },
  replyToFeedbackAdmin: (id, message) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.replyToFeedback(id, message);
    }
    return request(`/admin/feedback/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
  updateFeedbackStatus: (id, status) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.updateFeedbackStatus(id, status);
    }
    return request(`/admin/feedback/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  getAuditLogs: (params = {}) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getAuditLogs(params);
    }
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs${qs ? '?' + qs : ''}`);
  },

  // Student Detail & Status Management
  getAdminUserDetail: (userId) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getUserDetail(userId);
    }
    return request(`/admin/users/${userId}`);
  },
  updateStudentStatus: (userId, status, reason = '') => {
    if (isAdminDemoMode()) {
      return adminDemoStore.updateStudentStatus(userId, status, reason);
    }
    return request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },
  updateUserQuotaBytes: (userId, quotaBytes) => {
    if (isAdminDemoMode()) {
      const quotaMb = Math.round(quotaBytes / (1024 * 1024));
      return adminDemoStore.updateUserQuota(userId, quotaMb);
    }
    return request(`/admin/users/${userId}/quota`, {
      method: 'PUT',
      body: JSON.stringify({ quota_bytes: quotaBytes }),
    });
  },
  deleteStudentAccount: (userId) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.deleteStudentAccount(userId);
    }
    return request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Alerts & Broadcasts
  broadcastAdminAlert: (data) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.broadcastAlert(data);
    }
    const payload = {
      ...data,
      target_scope: data.target_scope || data.scope || 'all',
      scope: data.scope || data.target_scope || 'all',
      student_ids: data.student_ids || data.target_user_ids || [],
      target_user_ids: data.target_user_ids || data.student_ids || [],
    };
    return request('/admin/alerts/broadcast', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getAdminAlertsHistory: (limit = 30) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getAlertsHistory(limit);
    }
    return request(`/admin/alerts/history?limit=${limit}`);
  },

  // System Health & Monitoring
  getAdminSystemHealth: () => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getSystemHealth();
    }
    return request('/admin/system/health');
  },

  // Platform Admin Settings
  getAdminSettings: () => {
    if (isAdminDemoMode()) {
      return adminDemoStore.getSettings();
    }
    return request('/admin/settings');
  },
  updateAdminSettings: (data) => {
    if (isAdminDemoMode()) {
      return adminDemoStore.updateSettings(data);
    }
    return request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Student Portal Settings & Personalization
  getSettings: () => request('/settings'),
  updateSettings: (data) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  exportStudentData: () => request('/settings/export-data'),
  clearChatHistory: () =>
    request('/settings/clear-chat-history', {
      method: 'POST',
    }),
  requestAccountDeletion: (data) =>
    request('/settings/request-account-deletion', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

