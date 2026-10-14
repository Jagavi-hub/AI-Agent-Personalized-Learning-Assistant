// Centralized API client for LearnAI with Bearer JWT Auth & Student Isolation

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

    if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
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
  googleAuth: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
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

  // Learning Activities
  getActivities: () => request('/student/activities'),

  // AI Agent & Chat
  sendAgentMessage: (message, conversationId = null, actionOverride = null) =>
    request('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        action_override: actionOverride,
      }),
    }),
  getConversations: () => request('/agent/conversations'),
  getConversationDetails: (id) => request(`/agent/conversations/${id}`),
  deleteConversation: (id) => request(`/agent/conversations/${id}`, { method: 'DELETE' }),

  // Quiz & Adaptive Practice
  generateQuiz: (topic, difficulty = 'Intermediate', numQuestions = 5, subjectId = null) =>
    request('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        difficulty,
        num_questions: numQuestions,
        subject_id: subjectId,
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

  // Knowledge Base (RAG)
  getDocuments: () => request('/knowledge/documents'),
  uploadDocument: (formData) =>
    request('/knowledge/upload', {
      method: 'POST',
      body: formData,
    }),
  deleteDocument: (id) => request(`/knowledge/documents/${id}`, { method: 'DELETE' }),
  searchKnowledge: (query, topK = 3) =>
    request('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK }),
    }),

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

  // Feedback
  submitFeedback: (feedback) => request('/feedback', { method: 'POST', body: JSON.stringify(feedback) }),
  getFeedback: () => request('/feedback'),
};
