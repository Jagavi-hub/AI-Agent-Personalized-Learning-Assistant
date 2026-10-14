import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken } from '../services/api';

const StudentContext = createContext();

export function StudentProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const fetchCurrentUser = async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const studentData = await api.getMe();
      setUser(studentData);
    } catch (err) {
      console.warn('Session verification failed or expired:', err.message);
      setStoredToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    setStoredToken(res.access_token);
    setToken(res.access_token);
    setUser(res.student);
    return res;
  };

  const register = async (data) => {
    const res = await api.register(data);
    setStoredToken(res.access_token);
    setToken(res.access_token);
    setUser(res.student);
    return res;
  };

  const googleAuth = async (credential) => {
    const res = await api.googleAuth(credential);
    setStoredToken(res.access_token);
    setToken(res.access_token);
    setUser(res.student);
    return res;
  };

  const logout = async () => {
    await api.logout();
    setStoredToken(null);
    setToken(null);
    setUser(null);
    showNotification('You have been logged out.', 'info');
  };

  const completeOnboarding = async (data) => {
    const updated = await api.completeOnboarding(data);
    setUser(updated);
    return updated;
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <StudentContext.Provider
      value={{
        user,
        profile: user,
        token,
        isAuthenticated: !!user,
        isOnboarded: user?.is_onboarded ?? false,
        loading,
        login,
        register,
        googleAuth,
        logout,
        completeOnboarding,
        refreshProfile: fetchCurrentUser,
        notification,
        showNotification,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export const useStudent = () => useContext(StudentContext);
