import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { StudentProvider } from './context/StudentContext';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import MyLearning from './pages/MyLearning';
import QuizPractice from './pages/QuizPractice';
import Recommendations from './pages/Recommendations';
import KnowledgeBase from './pages/KnowledgeBase';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <StudentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="my-learning" element={<MyLearning />} />
              <Route path="quiz" element={<QuizPractice />} />
              <Route path="recommendations" element={<Recommendations />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </StudentProvider>
    </ThemeProvider>
  );
}
