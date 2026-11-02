import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Cpu,
  RefreshCw,
  BookOpen,
  Bot,
  GraduationCap,
  Bell,
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  LogOut,
  Download,
  Trash2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Sparkles,
  Volume2,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  Database,
  Type,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStudent } from '../context/StudentContext';
import { api } from '../services/api';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout, showNotification } = useStudent();

  // Settings State
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  
  const [learningPrefs, setLearningPrefs] = useState({
    preferred_learning_style: 'Visual',
    explanation_level: 'Detailed',
    preferred_answer_format: 'Step-by-step',
    preferred_language: 'English',
    study_pace: 'Moderate',
  });

  const [aiPrefs, setAiPrefs] = useState({
    voice_enabled: false,
    explanation_verbosity: 'Detailed',
    include_examples: true,
    show_pdf_citations: true,
    enable_followup_suggestions: true,
  });

  const [quizPrefs, setQuizPrefs] = useState({
    default_num_questions: 5,
    preferred_difficulty: 'Medium',
    preferred_question_type: 'MCQ',
    show_explanations: true,
    enable_timer: false,
  });

  const [notifPrefs, setNotifPrefs] = useState({
    learning_reminders: true,
    study_goal_reminders: true,
    quiz_results: true,
    learning_recommendations: true,
    feedback_replies: true,
    platform_announcements: true,
  });

  const [accessibility, setAccessibility] = useState({
    font_size: localStorage.getItem('learnai_font_size') || 'Medium',
    reduced_motion: localStorage.getItem('learnai_reduced_motion') === 'true',
    high_contrast_focus: localStorage.getItem('learnai_high_contrast_focus') !== 'false',
  });

  // Password Change Form State
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdUpdating, setPwdUpdating] = useState(false);

  // Modals & Action Dialogs
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Diagnostics Collapsible State
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [health, setHealth] = useState({ online: false, gemini: false });
  const [checkingHealth, setCheckingHealth] = useState(false);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Load Settings on Component Mount
  useEffect(() => {
    loadSettings();
    checkHealth(false);
  }, []);

  // Apply Accessibility attributes to HTML document
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', accessibility.font_size.toLowerCase());
    document.documentElement.setAttribute('data-reduced-motion', accessibility.reduced_motion.toString());
    document.documentElement.setAttribute('data-high-contrast-focus', accessibility.high_contrast_focus.toString());
    
    localStorage.setItem('learnai_font_size', accessibility.font_size);
    localStorage.setItem('learnai_reduced_motion', accessibility.reduced_motion.toString());
    localStorage.setItem('learnai_high_contrast_focus', accessibility.high_contrast_focus.toString());
  }, [accessibility]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      if (data.learning_preferences) setLearningPrefs(data.learning_preferences);
      if (data.ai_tutor_preferences) setAiPrefs(data.ai_tutor_preferences);
      if (data.quiz_preferences) setQuizPrefs(data.quiz_preferences);
      if (data.notifications) setNotifPrefs(data.notifications);
      if (data.accessibility) {
        setAccessibility((prev) => ({
          ...prev,
          ...data.accessibility,
        }));
      }
    } catch (err) {
      console.warn('Failed to load settings from server, using local fallbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Persistent Save Handler
  const savePreferences = async (updates) => {
    try {
      setSaveStatus('saving');
      await api.updateSettings(updates);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to update settings:', err);
      setSaveStatus('error');
      showNotification('Failed to save settings changes.', 'error');
    }
  };

  const updateLearningPref = (key, value) => {
    const updated = { ...learningPrefs, [key]: value };
    setLearningPrefs(updated);
    savePreferences({ learning_preferences: { [key]: value } });
  };

  const updateAiPref = (key, value) => {
    const updated = { ...aiPrefs, [key]: value };
    setAiPrefs(updated);
    savePreferences({ ai_tutor_preferences: { [key]: value } });
  };

  const updateQuizPref = (key, value) => {
    const updated = { ...quizPrefs, [key]: value };
    setQuizPrefs(updated);
    savePreferences({ quiz_preferences: { [key]: value } });
  };

  const updateNotifPref = (key, value) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    savePreferences({ notifications: { [key]: value } });
  };

  const updateAccessibilityPref = (key, value) => {
    const updated = { ...accessibility, [key]: value };
    setAccessibility(updated);
    savePreferences({ accessibility: { [key]: value } });
  };

  const checkHealth = async (notify = true) => {
    try {
      setCheckingHealth(true);
      const res = await api.getHealth();
      setHealth({ online: true, gemini: res.gemini_configured });
      if (notify) showNotification('System diagnostics connection verified', 'success');
    } catch (err) {
      setHealth({ online: false, gemini: false });
      if (notify) showNotification('Could not reach backend application server', 'error');
    } finally {
      setCheckingHealth(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!pwdForm.current_password || !pwdForm.new_password) {
      showNotification('Please fill in both current and new passwords.', 'error');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_new_password) {
      showNotification('New passwords do not match.', 'error');
      return;
    }
    if (pwdForm.new_password.length < 6) {
      showNotification('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      setPwdUpdating(true);
      await api.changePassword(pwdForm);
      showNotification('Password updated successfully!', 'success');
      setPwdForm({ current_password: '', new_password: '', confirm_new_password: '' });
    } catch (err) {
      showNotification(err.message || 'Failed to update password', 'error');
    } finally {
      setPwdUpdating(false);
    }
  };

  const handleClearChatHistory = async () => {
    try {
      setClearingChat(true);
      await api.clearChatHistory();
      showNotification('Your conversational chat history has been cleared.', 'success');
      setShowClearChatModal(false);
    } catch (err) {
      showNotification('Failed to clear chat history: ' + err.message, 'error');
    } finally {
      setClearingChat(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await api.exportStudentData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LearnAI_Data_Export_${user?.name?.replace(/\s+/g, '_') || 'Student'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Personal learning data exported successfully.', 'success');
    } catch (err) {
      showNotification('Failed to export learning data.', 'error');
    }
  };

  const handleAccountDeletion = async (e) => {
    e.preventDefault();
    if (deleteConfirmPhrase.trim() !== 'DELETE MY ACCOUNT') {
      showNotification('Please type DELETE MY ACCOUNT to confirm.', 'error');
      return;
    }

    try {
      setDeletingAccount(true);
      const res = await api.requestAccountDeletion({
        reason: deleteReason,
        confirm_phrase: deleteConfirmPhrase.trim(),
      });
      showNotification(res.message, 'info');
      setShowDeleteAccountModal(false);
    } catch (err) {
      showNotification(err.message || 'Failed to submit account deletion request.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const faqs = [
    {
      q: 'How does the AI Learning Assistant personalize its responses?',
      a: 'The assistant uses your active enrolled course, preferred learning style, chosen explanation level, and recent quiz performance to tailor vocabulary, examples, and response depth.',
    },
    {
      q: 'Where do PDF citations and references come from?',
      a: 'Citations are retrieved strictly from real lecture slides, syllabi, and academic textbooks uploaded to the Knowledge Base. When references are disabled or no source exists, the assistant provides general knowledge clearly labeled without fabricated citations.',
    },
    {
      q: 'What happens when I change my explanation level?',
      a: 'Switching to "Simple" triggers intuitive analogies and avoids dense academic jargon. "Intermediate" balances terminology with foundational math. "Detailed" provides comprehensive mathematical formulations, proofs, and rigorous mechanisms.',
    },
    {
      q: 'Can other students see my learning data or uploaded notes?',
      a: 'No. Student uploads, chat histories, goals, and quiz scores are strictly scoped to your private authenticated student ID.',
    },
    {
      q: 'How do notification toggles work?',
      a: 'Disabling a category immediately hides existing notifications of that type from your notification center and prevents new ones from being generated.',
    },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700 }}>Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Personalize your learning environment, AI assistant behavior, assessment defaults, and account privacy.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {saveStatus === 'saving' && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <RefreshCw size={13} className="spinner" /> Saving changes...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
              <CheckCircle2 size={14} /> All preferences saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertTriangle size={14} /> Changes not saved
            </span>
          )}
        </div>
      </div>

      {/* 2. Appearance & Theme — MUST KEEP */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              {theme === 'light' ? <Sun size={18} color="var(--primary)" /> : <Moon size={18} color="var(--primary)" />}
              Appearance & Theme
            </div>
            <div className="card-desc">Choose between EdTech light mode and high-contrast deep navy dark mode</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.25rem' }}>
          {/* Light Mode Option */}
          <div
            onClick={() => setTheme('light')}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border)'}`,
              backgroundColor: theme === 'light' ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4f46e5',
                }}
              >
                <Sun size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Light Theme
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Clean soft neutral background
                </div>
              </div>
            </div>
            {theme === 'light' && <Check size={18} color="var(--primary)" />}
          </div>

          {/* Dark Mode Option */}
          <div
            onClick={() => setTheme('dark')}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border)'}`,
              backgroundColor: theme === 'dark' ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <Moon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Dark Theme
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  High-contrast deep navy palette
                </div>
              </div>
            </div>
            {theme === 'dark' && <Check size={18} color="var(--primary)" />}
          </div>
        </div>
      </div>

      {/* 3. Learning Preferences */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <BookOpen size={18} color="var(--primary)" />
              Learning Preferences
            </div>
            <div className="card-desc">Personalize how explanations and study materials are presented</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Preferred Learning Style */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
              Preferred Learning Style
            </label>
            <div className="settings-pill-group">
              {['Visual', 'Reading', 'Practical', 'Mixed'].map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => updateLearningPref('preferred_learning_style', style)}
                  className={`settings-pill ${learningPrefs.preferred_learning_style === style ? 'settings-pill-active' : ''}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation Level */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
              Explanation Depth & Rigor
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {[
                { level: 'Simple', desc: 'Analogies, plain language, and accessible concept overviews' },
                { level: 'Intermediate', desc: 'Standard collegiate rigor balancing intuition with technical terminology' },
                { level: 'Detailed', desc: 'Formal mathematical proofs, architectural breakdowns, and comprehensive mechanisms' },
              ].map((item) => (
                <div
                  key={item.level}
                  onClick={() => updateLearningPref('explanation_level', item.level)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${learningPrefs.explanation_level === item.level ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: learningPrefs.explanation_level === item.level ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: learningPrefs.explanation_level === item.level ? 'var(--primary)' : 'var(--text-main)' }}>
                    {item.level}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Answer Format */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
              Preferred Answer Format
            </label>
            <div className="settings-pill-group">
              {['Step-by-step', 'Examples', 'Summary', 'Detailed Explanation'].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => updateLearningPref('preferred_answer_format', fmt)}
                  className={`settings-pill ${learningPrefs.preferred_answer_format === fmt ? 'settings-pill-active' : ''}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Language & Study Pace Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
                Preferred Language
              </label>
              <select
                value={learningPrefs.preferred_language}
                onChange={(e) => updateLearningPref('preferred_language', e.target.value)}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="English">English (Curriculum Standard)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
                Study Pace
              </label>
              <div className="settings-pill-group">
                {['Slow', 'Moderate', 'Fast'].map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => updateLearningPref('study_pace', pace)}
                    className={`settings-pill ${learningPrefs.study_pace === pace ? 'settings-pill-active' : ''}`}
                  >
                    {pace}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. AI Tutor Preferences */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Bot size={18} color="var(--primary)" />
              AI Tutor Preferences
            </div>
            <div className="card-desc">Configure conversational AI behavior, citations, and grounded context</div>
          </div>
        </div>

        <div>
          {/* Include Examples & Real-world Applications */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Include Real-World Applications & Examples
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Automatically supplements academic theories with tangible industry use cases and code snippets.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiPrefs.include_examples}
              onClick={() => updateAiPref('include_examples', !aiPrefs.include_examples)}
              className={`settings-toggle ${aiPrefs.include_examples ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${aiPrefs.include_examples ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>

          {/* Show References to Uploaded Course PDFs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Show References to Uploaded Course PDFs
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Grounds responses in verified course materials and cites authentic filenames and page numbers.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiPrefs.show_pdf_citations}
              onClick={() => updateAiPref('show_pdf_citations', !aiPrefs.show_pdf_citations)}
              className={`settings-toggle ${aiPrefs.show_pdf_citations ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${aiPrefs.show_pdf_citations ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>

          {/* Follow-up Learning Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Enable Follow-up Learning Suggestions
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Proactively offers relevant deeper questions, related syllabus topics, or practice prompts.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiPrefs.enable_followup_suggestions}
              onClick={() => updateAiPref('enable_followup_suggestions', !aiPrefs.enable_followup_suggestions)}
              className={`settings-toggle ${aiPrefs.enable_followup_suggestions ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${aiPrefs.enable_followup_suggestions ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>

          {/* Voice Explanations (Audio Readout) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Voice Explanations (Text-to-Speech)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Enables browser-based speech synthesis audio buttons on assistant responses.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiPrefs.voice_enabled}
              onClick={() => updateAiPref('voice_enabled', !aiPrefs.voice_enabled)}
              className={`settings-toggle ${aiPrefs.voice_enabled ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${aiPrefs.voice_enabled ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Quiz & Assessment Preferences */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <GraduationCap size={18} color="var(--primary)" />
              Quiz & Assessment Preferences
            </div>
            <div className="card-desc">Set your default practice assessment parameters and review preferences</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Default Question Count & Difficulty */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
                Default Number of Questions
              </label>
              <div className="settings-pill-group">
                {[3, 5, 10, 15].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => updateQuizPref('default_num_questions', num)}
                    className={`settings-pill ${quizPrefs.default_num_questions === num ? 'settings-pill-active' : ''}`}
                  >
                    {num} Questions
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
                Preferred Difficulty Level
              </label>
              <div className="settings-pill-group">
                {['Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => updateQuizPref('preferred_difficulty', diff)}
                    className={`settings-pill ${quizPrefs.preferred_difficulty === diff ? 'settings-pill-active' : ''}`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Type */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
              Preferred Question Format
            </label>
            <div className="settings-pill-group">
              {[
                { type: 'MCQ', label: 'Multiple Choice (MCQ)' },
                { type: 'True/False', label: 'True / False' },
                { type: 'Short Answer', label: 'Short Answer (Conceptual)' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => updateQuizPref('preferred_question_type', item.type)}
                  className={`settings-pill ${quizPrefs.preferred_question_type === item.type ? 'settings-pill-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instant Explanations Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Show Instant Explanations after Submission
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Reveals conceptual breakdown and source citations immediately after completing a quiz.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={quizPrefs.show_explanations}
              onClick={() => updateQuizPref('show_explanations', !quizPrefs.show_explanations)}
              className={`settings-toggle ${quizPrefs.show_explanations ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${quizPrefs.show_explanations ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>

          {/* Enable Timer Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Enable Assessment Countdown Timer
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Displays a pacing timer during quizzes to simulate examination conditions.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={quizPrefs.enable_timer}
              onClick={() => updateQuizPref('enable_timer', !quizPrefs.enable_timer)}
              className={`settings-toggle ${quizPrefs.enable_timer ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${quizPrefs.enable_timer ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Notifications */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Bell size={18} color="var(--primary)" />
              Notification Preferences
            </div>
            <div className="card-desc">Control what alerts and notifications appear in your in-app notification center</div>
          </div>
        </div>

        <div>
          {[
            { key: 'learning_reminders', label: 'Learning Reminders', desc: 'Alerts when scheduled study milestones or review sessions are due' },
            { key: 'study_goal_reminders', label: 'Study Goal Reminders', desc: 'Progress check-ins for active learning goals nearing their target date' },
            { key: 'quiz_results', label: 'Quiz Results & Mastery Updates', desc: 'Notifications when assessment scores and weak-topic remediations are processed' },
            { key: 'learning_recommendations', label: 'Personalized Learning Recommendations', desc: 'Interventions and curated courseware recommendations generated by AI' },
            { key: 'feedback_replies', label: 'Feedback & Support Replies', desc: 'Direct responses from course coordinators and platform administrators' },
            { key: 'platform_announcements', label: 'Important Platform Announcements', desc: 'Critical academic term announcements and system maintenance updates' },
          ].map((item, idx, arr) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 0',
                borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {item.desc}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifPrefs[item.key]}
                onClick={() => updateNotifPref(item.key, !notifPrefs[item.key])}
                className={`settings-toggle ${notifPrefs[item.key] ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
              >
                <span className={`settings-toggle-thumb ${notifPrefs[item.key] ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Account & Security */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Shield size={18} color="var(--primary)" />
              Account & Security
            </div>
            <div className="card-desc">Manage sign-in authentication methods and account credentials</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Account Status Overview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-hover)',
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {user?.name || 'Authenticated Student'}
                </span>
                <span className="badge badge-primary">
                  {user?.auth_provider === 'google' ? 'Google Account' : 'Email & Password'}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {user?.email || 'student@university.edu'} • Student ID #{user?.id || 1}
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn btn-sm btn-secondary"
              style={{ color: 'var(--danger)' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>

          {/* Google Account Connection Status */}
          <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Google Sign-In Connection
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {user?.auth_provider === 'google' || user?.google_id
                    ? 'Connected via institutional Google Workspace OAuth 2.0.'
                    : 'Not connected. Sign in using your university Google account on the login page to link.'}
                </div>
              </div>
              <span className={`badge ${user?.auth_provider === 'google' || user?.google_id ? 'badge-success' : 'badge-neutral'}`}>
                {user?.auth_provider === 'google' || user?.google_id ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>

          {/* Change Password Form (Only for password-authenticated accounts) */}
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Change Password
            </div>
            {user?.auth_provider === 'google' && !user?.hashed_password ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Password changes are unavailable because this profile is authenticated through Google Sign-In.
              </p>
            ) : (
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '0.3rem' }}>
                      Current Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={pwdForm.current_password}
                        onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                        className="input-field"
                        placeholder="••••••••"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '0.3rem' }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={pwdForm.new_password}
                        onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                        className="input-field"
                        placeholder="Min. 6 characters"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '0.3rem' }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={pwdForm.confirm_new_password}
                      onChange={(e) => setPwdForm({ ...pwdForm, confirm_new_password: e.target.value })}
                      className="input-field"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button type="submit" disabled={pwdUpdating} className="btn btn-sm btn-primary">
                    {pwdUpdating ? <RefreshCw size={14} className="spinner" /> : <Lock size={14} />} Update Password
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Deletion Request */}
          <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Account Deletion or Deactivation
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Request removal of your student account and unlinking of institutional credentials.
              </div>
            </div>
            <button
              onClick={() => setShowDeleteAccountModal(true)}
              className="btn btn-sm btn-secondary"
              style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
            >
              Request Account Deletion
            </button>
          </div>
        </div>
      </div>

      {/* 8. Privacy & Learning Data */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Shield size={18} color="var(--primary)" />
              Privacy & Learning Data
            </div>
            <div className="card-desc">Control your data footprint, export learning records, and manage stored materials</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Action Row 1: View Uploaded Materials */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Course Materials & Uploaded Files
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                View, manage, or delete personal notes and indexed course materials in the Knowledge Base.
              </div>
            </div>
            <button onClick={() => navigate('/knowledge-base')} className="btn btn-sm btn-secondary">
              <FileText size={14} /> Knowledge Base
            </button>
          </div>

          {/* Action Row 2: Export Personal Learning Data */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Download Learning Data Export (JSON)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Download a portable copy of your goals, quiz history, activity metrics, and profile settings.
              </div>
            </div>
            <button onClick={handleExportData} className="btn btn-sm btn-secondary">
              <Download size={14} /> Export Data
            </button>
          </div>

          {/* Action Row 3: Clear Chat History */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Clear AI Assistant Chat History
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Permanently deletes conversational messages and discussion threads owned by your account.
              </div>
            </div>
            <button
              onClick={() => setShowClearChatModal(true)}
              className="btn btn-sm btn-secondary"
              style={{ color: 'var(--danger)' }}
            >
              <Trash2 size={14} /> Clear Chat
            </button>
          </div>

          {/* Retention Information */}
          <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>Institutional Privacy Notice:</strong> Your learning activities, assessment scores, and doubt explanations are retained locally for academic continuity. Student files are protected by isolated student IDs, and personal documents can be purged at any time from Knowledge Base.
          </div>
        </div>
      </div>

      {/* 9. Accessibility & Display */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Type size={18} color="var(--primary)" />
              Accessibility & Display
            </div>
            <div className="card-desc">Adjust interface sizing, motion sensitivity, and focus indicators</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Font Size Selector */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
              Interface Font Size
            </label>
            <div className="settings-pill-group">
              {['Small', 'Medium', 'Large'].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateAccessibilityPref('font_size', size)}
                  className={`settings-pill ${accessibility.font_size === size ? 'settings-pill-active' : ''}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Reduce Motion */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Reduce Animations & Motion
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Minimizes interface transitions and decorative animations for a calmer visual experience.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={accessibility.reduced_motion}
              onClick={() => updateAccessibilityPref('reduced_motion', !accessibility.reduced_motion)}
              className={`settings-toggle ${accessibility.reduced_motion ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${accessibility.reduced_motion ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>

          {/* Clear Focus Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Enhanced Keyboard Focus Indicators
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Highlights active buttons, form inputs, and links with high-contrast visual focus rings.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={accessibility.high_contrast_focus}
              onClick={() => updateAccessibilityPref('high_contrast_focus', !accessibility.high_contrast_focus)}
              className={`settings-toggle ${accessibility.high_contrast_focus ? 'settings-toggle-active' : 'settings-toggle-inactive'}`}
            >
              <span className={`settings-toggle-thumb ${accessibility.high_contrast_focus ? 'settings-toggle-thumb-active' : 'settings-toggle-thumb-inactive'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 10. Help & Support */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <HelpCircle size={18} color="var(--primary)" />
              Help & Support
            </div>
            <div className="card-desc">Find answers to common questions or connect with course coordinators</div>
          </div>
          <button onClick={() => navigate('/feedback-support')} className="btn btn-sm btn-secondary">
            Feedback & Support <ExternalLink size={14} />
          </button>
        </div>

        <div>
          {/* FAQ Accordion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {faqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={index}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                    }}
                  >
                    <span>{faq.q}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 1rem 0.85rem', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <span>LearnAI Higher Education Assistant • v2.4.0 (2026 Academic Edition)</span>
            <button
              onClick={() => navigate('/feedback-support')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* 11. Collapsible System Status & Diagnostics */}
      <div className="card">
        <div
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: diagnosticsOpen ? '0 0 1rem 0' : '0',
            borderBottom: diagnosticsOpen ? '1px solid var(--border)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Cpu size={18} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                System Status & Diagnostics
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Underlying server connectivity, AI provider verification, and database diagnostics
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className={`badge ${health.online ? 'badge-success' : 'badge-danger'}`}>
              {health.online ? 'Operational' : 'Server Offline'}
            </span>
            {diagnosticsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {diagnosticsOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  checkHealth(true);
                }}
                disabled={checkingHealth}
                className="btn btn-sm btn-secondary"
              >
                <RefreshCw size={14} className={checkingHealth ? 'spinner' : ''} /> Check Status
              </button>
            </div>

            {/* Service Status Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    FastAPI Application Server
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Core REST API & Authentication Services
                  </div>
                </div>
                <span className={`badge ${health.online ? 'badge-success' : 'badge-danger'}`}>
                  {health.online ? 'Operational' : 'Offline'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Google Gemini API Integration
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {health.gemini
                      ? 'Live Gemini API connected (gemini-1.5-flash)'
                      : 'Deterministic Academic Engine Active (Offline Fallback)'}
                  </div>
                </div>
                <span className={`badge ${health.gemini ? 'badge-success' : 'badge-primary'}`}>
                  {health.gemini ? 'Live API Active' : 'Fallback Engine Active'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Semantic Retrieval Engine (RAG)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    TF-IDF & Cosine Similarity vector index over courseware documents
                  </div>
                </div>
                <span className="badge badge-success">Operational</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Relational Storage Engine
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    SQLite 3 with ACID transactions and declarative SQLAlchemy 2.0 ORM
                  </div>
                </div>
                <span className="badge badge-success">Operational</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal: Clear Chat History */}
      {showClearChatModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <Trash2 size={20} color="var(--danger)" />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Clear Chat History?</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              This will permanently delete all conversational messages and discussions you have had with the AI assistant. Shared course materials and syllabus information will not be affected.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowClearChatModal(false)}
                className="btn btn-secondary"
                disabled={clearingChat}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChatHistory}
                disabled={clearingChat}
                className="btn btn-danger"
              >
                {clearingChat ? <RefreshCw size={14} className="spinner" /> : <Trash2 size={14} />} Yes, Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Account */}
      {showDeleteAccountModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <AlertTriangle size={20} color="var(--danger)" />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Request Account Deletion</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Institutional accounts are managed under university records policies. Submitting this request notifies the department administrator to process data purge and decouple your Google Workspace credentials.
            </p>
            <form onSubmit={handleAccountDeletion} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '0.3rem' }}>
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Graduated, transferred department"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '0.3rem' }}>
                  To confirm, type <span style={{ fontWeight: 700, color: 'var(--danger)' }}>DELETE MY ACCOUNT</span>:
                </label>
                <input
                  type="text"
                  value={deleteConfirmPhrase}
                  onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                  className="input-field"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="btn btn-secondary"
                  disabled={deletingAccount}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || deleteConfirmPhrase.trim() !== 'DELETE MY ACCOUNT'}
                  className="btn btn-danger"
                >
                  {deletingAccount ? <RefreshCw size={14} className="spinner" /> : null} Submit Deletion Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
