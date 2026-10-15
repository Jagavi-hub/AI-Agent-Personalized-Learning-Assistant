import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Activity,
  Eye,
  X,
  ArrowRight,
  BrainCircuit,
  Clock,
  Layers,
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
  { id: 'notes_qa', label: 'Notes Q&A (RAG)', icon: FileText },
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
  const [showActivityPanel, setShowActivityPanel] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState(null);

  const [suggestedFollowups, setSuggestedFollowups] = useState([
    'How does Tom Mitchell define a well-posed learning problem in 22AI503?',
    'What capabilities are required for an AI agent to pass the Turing Test (21CB603)?',
    'Explain the difference between propagation delay and transmission delay in Computer Networks (22CS502).',
    'What are the essential characteristics of Cloud Computing defined by NIST (22IT402)?'
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

      // Select the latest agent decision
      const latestAssistant = [...loadedMessages].reverse().find(
        (m) => m.sender === 'assistant' && m.agent_action
      );
      if (latestAssistant) {
        setSelectedDecision(latestAssistant.agent_action);
      }
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
    setSelectedDecision(initialDecision);
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
      setSelectedDecision(response.agent_decision);

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

  // Current active decision to display in the panel
  const activeDecision = selectedDecision || {
    action_type: 'ready',
    intent: 'Waiting for Query',
    rationale: 'Agent initialized and ready to inspect queries, select tools, and synthesize grounded answers.',
    tool_executed: 'tool_idle',
    provider: 'LearnAI Academic Engine',
    is_fallback: false,
    learner_context_used: {
      skill_level: profile?.current_skill_level || 'Intermediate',
      learning_style: profile?.preferred_learning_style || 'Visual & Practical',
      identified_weak_topics: ['Backpropagation & Neural Networks'],
      recent_quiz_count: 1,
    },
    retrieved_sources: [],
    recommended_next_step: 'Ask a question or select an action override below',
    response_time_ms: 0.0,
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '1.25rem',
        height: 'calc(100vh - 120px)',
        minHeight: '600px',
      }}
    >
      {/* Column 1: Discussions History Drawer */}
      <div
        className="card"
        style={{
          width: '240px',
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
          <button
            onClick={startNewConversation}
            className="btn btn-sm btn-primary"
            title="Start New Discussion"
          >
            <Plus size={14} /> New
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
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

      {/* Column 2: Main Chat Interface */}
      <div
        className="card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Chat Header with Action Category Filter and Activity Panel Toggle */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
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
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                LearnAI Agent Orchestrator
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Context: {profile?.name || 'Student'} • Tier: {profile?.current_skill_level || 'Intermediate'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Subject Context Selector */}
            {subjects.length > 0 && (
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.65rem',
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

            {/* Toggle AI Agent Activity Panel Button */}
            <button
              onClick={() => setShowActivityPanel(!showActivityPanel)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid var(--border)',
                backgroundColor: showActivityPanel ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                color: showActivityPanel ? 'var(--primary)' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Toggle AI Agent Activity Panel"
            >
              <Activity size={14} />
              <span>Activity Panel</span>
            </button>
          </div>
        </div>

        {/* Action Category Override Pills */}
        <div
          style={{
            padding: '0.5rem 1.25rem',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
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
                  padding: '0.25rem 0.65rem',
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

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
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
                  maxWidth: isUser ? '80%' : '90%',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Agent Decision Badge with Inspect Button */}
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
                    <button
                      onClick={() => {
                        setSelectedDecision(msg.agent_action);
                        setShowActivityPanel(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--primary)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.675rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Inspect Agent Decision in Activity Panel"
                    >
                      <Eye size={10} /> Inspect
                    </button>
                  </div>
                )}

                {/* Message Content Bubble */}
                <div
                  style={{
                    backgroundColor: isUser ? 'var(--primary)' : 'var(--bg-surface-hover)',
                    color: isUser ? '#ffffff' : 'var(--text-main)',
                    padding: '1rem 1.25rem',
                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    border: isUser ? 'none' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    lineHeight: 1.6,
                    fontSize: '0.925rem',
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
                          <pre style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '0.85rem', borderRadius: '8px', overflowX: 'auto', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}><code {...props} /></pre>
                        ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>

                  {/* Knowledge Base Source Citations */}
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
              padding: '0.5rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
            }}
          >
            <span style={{ fontSize: '0.725rem', color: 'var(--text-light)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
              Suggested:
            </span>
            {suggestedFollowups.slice(0, 3).map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSendMessage(prompt)}
                style={{
                  background: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.65rem',
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

        {/* Input Composer Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            className="input-field"
            placeholder={
              selectedActionOverride
                ? `Direct query with action [${selectedActionOverride}]...`
                : "Ask about backpropagation, normalization, study plan, or paste lecture notes..."
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
            style={{ height: '42px', padding: '0 1.25rem' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Column 3: AI Agent Activity Panel (Dedicated Live Inspector) */}
      {showActivityPanel && (
        <div
          className="card"
          style={{
            width: '350px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            flexShrink: 0,
            overflowY: 'auto',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {/* Activity Panel Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BrainCircuit size={17} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  AI Agent Activity
                </div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  Decision & Context Inspector
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowActivityPanel(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-light)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
              title="Close Activity Panel"
            >
              <X size={16} />
            </button>
          </div>

          {/* 1. Learning Requirement Detected */}
          <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '8px', padding: '0.85rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              1. Learning Requirement Detected
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem' }}>
              {activeDecision.detected_intent || activeDecision.intent || 'Concept Clarification'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              <span>Action: <code>{activeDecision.selected_action || activeDecision.action_type}</code></span>
              {activeDecision.service_routing?.service && (
                <span style={{ fontSize: '0.675rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>
                  {activeDecision.service_routing.service}
                </span>
              )}
            </div>
          </div>

          {/* 2. Learner Context Considered */}
          <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '8px', padding: '0.85rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              2. Learner Context Considered
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.775rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subject Context:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {activeDecision.relevant_student_context?.subject || activeDecision.learner_context_used?.subject || (subjects.find(s => s.id === selectedSubjectId)?.name || 'CS601: Deep Learning & Neural Networks')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Academic Level:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {profile?.year || '3rd Year'} • {activeDecision.relevant_student_context?.skill_level || activeDecision.learner_context_used?.skill_level || profile?.current_skill_level || 'Intermediate'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Learning Style:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {activeDecision.relevant_student_context?.learning_style || activeDecision.learner_context_used?.learning_style || profile?.preferred_learning_style || 'Visual & Practical'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Diagnostic Assessments:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {activeDecision.relevant_student_context?.recent_quiz_count ?? activeDecision.learner_context_used?.recent_quiz_count ?? 1} taken {activeDecision.relevant_student_context?.avg_quiz_score ? `(${Math.round(activeDecision.relevant_student_context.avg_quiz_score)}% avg)` : ''}
                </span>
              </div>

              {/* Identified Weak Topics */}
              <div style={{ marginTop: '0.3rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Identified Weak Topics:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {(activeDecision.relevant_student_context?.identified_weak_topics || activeDecision.learner_context_used?.identified_weak_topics || ['Backpropagation & Neural Networks']).map((t, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.7rem',
                        backgroundColor: 'var(--danger-light)',
                        color: 'var(--danger)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      <AlertCircle size={10} />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Action Selected & Rationale */}
          <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '8px', padding: '0.85rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              3. Action Selected & Rationale
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              {activeDecision.action_reason || activeDecision.rationale || 'Targeted educational response synthesized to align with student learning pace.'}
            </div>
          </div>

          {/* 4. Tools Invoked & Benchmark */}
          <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '8px', padding: '0.85rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
              4. Tools Invoked & Telemetry
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Executed Tool: </span>
                <code style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                  {activeDecision.tool_executed || 'tool_explain_concept'}
                </code>
              </div>
              {activeDecision.service_routing?.service && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target Service: </span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {activeDecision.service_routing.service}
                  </span>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Provider: </span>
                <span style={{ fontWeight: 600, color: activeDecision.is_fallback ? 'var(--warning)' : 'var(--success)' }}>
                  {activeDecision.provider || 'LearnAI Academic Engine'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={12} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)' }}>Response Latency: </span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {activeDecision.response_time_ms ? `${activeDecision.response_time_ms} ms` : '< 50 ms'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Retrieved Course Sources (RAG) */}
          <div style={{ backgroundColor: 'var(--bg-surface-hover)', borderRadius: '8px', padding: '0.85rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
              5. Retrieved Course Sources (RAG)
            </div>
            {activeDecision.retrieved_sources && activeDecision.retrieved_sources.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {activeDecision.retrieved_sources.map((src, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      fontSize: '0.725rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileText size={11} color="var(--primary)" />
                      {src.filename}
                    </div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Page {src.page_number} • Relevance: {src.score ? `${Math.round(src.score * 100)}%` : 'Grounded'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Grounded on core curricular syllabus and active learner state.
              </div>
            )}
          </div>

          {/* 6. Recommended Next Step */}
          <div
            style={{
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              borderRadius: '8px',
              padding: '0.85rem',
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
              6. Recommended Next Step
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-main)', fontWeight: 500 }}>
              <ArrowRight size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{activeDecision.recommended_next_step || 'Attempt diagnostic quiz in Quiz & Practice module'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
