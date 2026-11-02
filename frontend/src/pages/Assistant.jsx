import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  BookOpen,
  FileText,
  Calendar,
  Compass,
  AlertCircle,
  FileCheck,
  RefreshCw,
  X,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

const ACTION_PILLS = [
  { id: 'explain_concept', label: 'Explain Concept', icon: BookOpen },
  { id: 'simplify_concept', label: 'Simplify Concept', icon: Sparkles },
  { id: 'generate_quiz', label: 'Practice Quiz', icon: FileCheck },
  { id: 'revise_weak_topic', label: 'Revise Weak Area', icon: AlertCircle },
  { id: 'create_study_plan', label: 'Create Study Plan', icon: Calendar },
  { id: 'notes_qa', label: 'Notes Q&A', icon: FileText },
  { id: 'recommend_resources', label: 'Recommend Resources', icon: Compass },
];

export default function Assistant() {
  const { profile, showNotification } = useStudent();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedActionOverride, setSelectedActionOverride] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMobileDiscussions, setShowMobileDiscussions] = useState(false);

  const [suggestedFollowups, setSuggestedFollowups] = useState([
    'How does Tom Mitchell define a well-posed learning problem in 22AI503?',
    'What capabilities are required for an AI agent to pass the Turing Test (21CB603)?',
    'Explain the difference between propagation delay and transmission delay in Computer Networks (22CS502).',
    'What are the essential characteristics of Cloud Computing defined by NIST (22IT402)?',
  ]);

  const messagesEndRef = useRef(null);

  // Load conversations and subjects on mount
  useEffect(() => {
    loadConversations();
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const subList = await api.getSubjects();
      setSubjects(subList || []);
      if (subList && subList.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subList[0].id);
      }
    } catch (err) {
      console.warn('Could not load subjects:', err);
    }
  };

  const loadConversations = async () => {
    try {
      const convList = await api.getConversations();
      setConversations(convList);
      if (convList.length > 0 && !activeConvId) {
        selectConversation(convList[0].id);
      } else if (convList.length === 0) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (convId) => {
    try {
      setActiveConvId(convId);
      setLoading(true);
      const details = await api.getConversationDetails(convId);
      const loadedMessages = details.messages || [];
      setMessages(loadedMessages);
      setError(null);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
      setError('Could not load message history.');
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    const initialDecision = {
      action_type: 'initialize_session',
      intent: 'Learner Context Initialization',
      rationale: `Loaded profile for ${profile?.name || 'Student'} (${profile?.department || 'AI&DS'}). Active weak area context (Backpropagation & Neural Networks) primed.`,
      tool_executed: 'tool_load_learner_context',
      provider: 'LearnAI Context Manager',
      is_fallback: false,
      learner_context_used: {
        skill_level: profile?.current_skill_level || 'Intermediate',
        learning_style: profile?.preferred_learning_style || 'Visual & Practical',
        identified_weak_topics: ['Backpropagation & Neural Networks'],
        recent_quiz_count: 1,
      },
      retrieved_sources: [],
      recommended_next_step: 'Target Backpropagation with an adaptive revision query or diagnostic quiz',
      response_time_ms: 0.1,
    };

    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        content: `👋 Hello **${profile?.name || 'Student'}**! I am your **LearnAI Academic Agent**.

I have loaded your profile (**${profile?.department || 'Computer Science'}**, ${profile?.year || '3rd Year'}), reviewed your recent diagnostic quiz results, and indexed your course materials.

How can I help you master your curriculum today? You can choose a quick action below or ask me any question!`,
        agent_action: initialDecision,
        sources: [],
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this discussion thread?')) return;
    try {
      await api.deleteConversation(convId);
      showNotification('Conversation cleared', 'info');
      await loadConversations();
      if (activeConvId === convId) {
        startNewConversation();
      }
    } catch (err) {
      showNotification('Failed to delete conversation', 'error');
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMessage = {
      id: `client_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.sendAgentMessage(
        text,
        activeConvId,
        selectedActionOverride,
        selectedSubjectId
      );

      setActiveConvId(response.conversation_id);

      const assistantMessage = {
        id: response.message_id,
        sender: 'assistant',
        content: response.content,
        agent_action: response.agent_decision,
        sources: response.sources || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.suggested_followups && response.suggested_followups.length > 0) {
        setSuggestedFollowups(response.suggested_followups);
      }

      // Refresh conversations list to update title
      loadConversations();
      setSelectedActionOverride(null);
    } catch (err) {
      console.error('Agent message error:', err);
      setError(err.message || 'Failed to receive response from AI Agent.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="assistant-layout">
      {/* Column 1: Discussions History Sidebar (240-280px on desktop) */}
      <div
        className={`card assistant-discussions-col1 ${showMobileDiscussions ? 'mobile-visible' : ''}`}
        style={{
          width: '260px',
          padding: '1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Discussions
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => {
                startNewConversation();
                setShowMobileDiscussions(false);
              }}
              className="btn btn-sm btn-primary"
              title="Start New Discussion"
            >
              <Plus size={14} /> New
            </button>
            {showMobileDiscussions && (
              <button
                type="button"
                onClick={() => setShowMobileDiscussions(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close discussions panel"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                selectConversation(conv.id);
                setShowMobileDiscussions(false);
              }}
              style={{
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: activeConvId === conv.id ? 'var(--primary-light)' : 'transparent',
                border: activeConvId === conv.id ? '1px solid var(--primary-border)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: activeConvId === conv.id ? 600 : 500,
                    color: activeConvId === conv.id ? 'var(--primary)' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {conv.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.15rem' }}>
                  {new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
              </div>

              <button
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
                title="Delete thread"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {conversations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No previous threads.
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Main AI Learning Assistant Chat Interface (Expanded into available space) */}
      <div
        className="card"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {/* Chat Header: Title, Student Context, Mobile Discussions Button, and Course Selector */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-main)' }}>
                AI Learning Assistant
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Student: {profile?.name || 'Student'} • Level: {profile?.current_skill_level || 'Intermediate'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Mobile Discussions Button */}
            <button
              type="button"
              onClick={() => setShowMobileDiscussions(!showMobileDiscussions)}
              className="btn btn-sm btn-secondary mobile-menu-btn"
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
              }}
            >
              Discussions
            </button>

            {/* Selected Course Subject Context Selector */}
            {subjects.length > 0 && (
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  color: 'var(--text-main)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Select active course subject context"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}: {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Quick-Action Buttons (Explain Concept, Simplify Concept, Practice Quiz, Revise Weak Area, etc.) */}
        <div
          style={{
            padding: '0.55rem 1.5rem',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.725rem', color: 'var(--text-light)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
            Direct Action:
          </span>
          {ACTION_PILLS.map((pill) => {
            const Icon = pill.icon;
            const isSelected = selectedActionOverride === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setSelectedActionOverride(isSelected ? null : pill.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.7rem',
                  borderRadius: '9999px',
                  fontSize: '0.725rem',
                  fontWeight: 500,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-surface-hover)',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                }}
                title={`Direct Agent to: ${pill.label}`}
              >
                <Icon size={12} />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conversation History & Message Stream (Full Expanded Height & Width) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            minHeight: 0,
          }}
        >
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '75%' : '100%',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  width: isUser ? 'auto' : '100%',
                }}
              >
                {/* Agent Thought Pill */}
                {!isUser && msg.agent_action && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.4rem',
                      fontSize: '0.725rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span className="agent-thought-pill">
                      <Cpu size={11} />
                      {msg.agent_action.intent || 'Orchestration Action'}
                    </span>
                    <span style={{ color: 'var(--text-light)' }}>•</span>
                    <span>Tool: <code>{msg.agent_action.tool_executed}</code></span>
                    <span style={{ color: 'var(--text-light)' }}>•</span>
                    <span style={{ color: msg.agent_action.is_fallback ? 'var(--warning)' : 'var(--success)' }}>
                      {msg.agent_action.provider || 'AI Engine'}
                    </span>
                  </div>
                )}

                {/* Message Content Bubble */}
                <div
                  style={{
                    backgroundColor: isUser ? 'var(--primary)' : 'var(--bg-surface-hover)',
                    color: isUser ? '#ffffff' : 'var(--text-main)',
                    padding: '1.1rem 1.4rem',
                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    border: isUser ? 'none' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    lineHeight: 1.65,
                    fontSize: '0.925rem',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => <p style={{ marginBottom: '0.75rem', color: isUser ? '#ffffff' : 'inherit' }} {...props} />,
                      h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.05rem', marginTop: '1rem', marginBottom: '0.5rem', color: isUser ? '#ffffff' : 'var(--text-main)' }} {...props} />,
                      h4: ({ node, ...props }) => <h4 style={{ fontSize: '0.95rem', marginTop: '0.75rem', marginBottom: '0.4rem', color: isUser ? '#ffffff' : 'var(--text-main)' }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                      code: ({ node, inline, ...props }) =>
                        inline ? (
                          <code style={{ backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)', padding: '0.15rem 0.35rem', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.85em' }} {...props} />
                        ) : (
                          <pre style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '0.85rem', borderRadius: '8px', overflowX: 'auto', maxWidth: '100%', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}><code {...props} /></pre>
                        ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>

                  {/* Knowledge Base Source Citations (RAG) */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.65rem',
                        borderTop: '1px solid var(--border)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FileText size={13} />
                        Retrieved Course Sources:
                      </div>
                      {msg.sources.map((s, sIdx) => (
                        <div key={sIdx} style={{ marginBottom: '0.2rem' }}>
                          📄 <strong>{s.filename}</strong> (Page {s.page_number})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '0.675rem', color: 'var(--text-light)', marginTop: '0.3rem', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '12px', width: 'fit-content' }}>
              <RefreshCw size={16} color="var(--primary)" className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                LearnAI Agent analyzing learner history and synthesizing response...
              </span>
            </div>
          )}

          {/* Error Message with Retry */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid var(--danger)',
                borderRadius: '8px',
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{error}</span>
              <button onClick={() => handleSendMessage()} className="btn btn-sm btn-secondary">
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Follow-up Chips */}
        {suggestedFollowups.length > 0 && !loading && (
          <div
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.725rem', color: 'var(--text-light)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
              Suggested:
            </span>
            {suggestedFollowups.slice(0, 4).map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSendMessage(prompt)}
                style={{
                  background: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                title="Send suggested query"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Composer Bar (Fixed neatly at bottom) */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            className="input-field"
            placeholder={
              selectedActionOverride
                ? `Direct query with action [${ACTION_PILLS.find((p) => p.id === selectedActionOverride)?.label || selectedActionOverride}]...`
                : activeSubject
                ? `Ask about ${activeSubject.name}, key concepts, practice, or paste lecture notes...`
                : "Ask about machine learning, study plan, practice questions, or paste lecture notes..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled={loading}
            style={{ flex: 1 }}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            className="btn btn-primary"
            style={{ height: '42px', padding: '0 1.5rem' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
