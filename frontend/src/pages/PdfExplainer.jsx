import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  FileText,
  Search,
  ExternalLink,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  RotateCcw,
  GraduationCap,
  Layers,
  HelpCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Bookmark,
  Calendar,
  Clock,
  Cpu,
  Hash,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function PdfExplainer() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useStudent();

  // Library state
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Selected document state
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [outline, setOutline] = useState(null);
  const [explanationMode, setExplanationMode] = useState('complete'); // 'complete' or 'topic'
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Explanation content state
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [explanationError, setExplanationError] = useState(null);

  // Q&A state
  const [questionInput, setQuestionInput] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  const qaBottomRef = useRef(null);

  // Load document library
  useEffect(() => {
    fetchDocuments();
  }, []);

  // When route parameter documentId changes, load or select that document
  useEffect(() => {
    if (documentId && documents.length > 0) {
      const doc = documents.find((d) => String(d.id) === String(documentId));
      if (doc) {
        handleSelectDocument(doc, false);
      }
    }
  }, [documentId, documents]);

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const data = await api.getPdfExplainerDocuments();
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch explainer documents:', err);
      showNotification('Could not load course PDFs. Please try again.', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSelectDocument = async (doc, updateUrl = true) => {
    setSelectedDoc(doc);
    setExplanation(null);
    setExplanationError(null);
    setSelectedTopic(null);
    setExplanationMode('complete');
    setQaHistory([]);

    if (updateUrl) {
      navigate(`/pdf-explainer/${doc.id}`);
    }

    try {
      // 1. Fetch document outline
      const outlineData = await api.getPdfOutline(doc.id);
      setOutline(outlineData);

      // 2. Fetch or generate Complete Explanation (Mode A)
      loadExplanation(doc.id, 'complete', null, false, outlineData);
    } catch (err) {
      console.error('Failed to load outline for document:', err);
      loadExplanation(doc.id, 'complete', null, false, null);
    }
  };

  const loadExplanation = async (docId, mode, topicTitle = null, forceRegen = false, currentOutline = null) => {
    try {
      if (forceRegen) {
        setRegenerating(true);
      } else {
        setLoadingExplanation(true);
      }
      setExplanationError(null);

      const res = await api.explainPdfDocument(docId, mode, topicTitle, forceRegen);
      setExplanation(res);

      if (res.outline && (!outline || !outline.topics || outline.topics.length === 0)) {
        setOutline({
          document_id: docId,
          filename: res.filename,
          readable_title: res.readable_title,
          course_name: res.course_name,
          total_pages: res.total_pages || 1,
          topics: res.outline,
        });
      }

      if (forceRegen) {
        showNotification('AI Explanation regenerated successfully!', 'success');
      }
    } catch (err) {
      console.error('Explanation error:', err);
      setExplanationError(err.message || 'Failed to generate explanation for this document.');
      showNotification(err.message || 'Error generating explanation', 'error');
    } finally {
      setLoadingExplanation(false);
      setRegenerating(false);
    }
  };

  const handleSwitchToMode = (newMode) => {
    if (!selectedDoc) return;
    setExplanationMode(newMode);

    if (newMode === 'complete') {
      setSelectedTopic(null);
      loadExplanation(selectedDoc.id, 'complete', null, false);
    } else {
      // Topic mode: select first topic in outline if none selected
      const firstTopic = outline?.topics?.[0]?.title || selectedDoc.extracted_topics?.[0] || 'Overview';
      const targetTopic = selectedTopic || firstTopic;
      setSelectedTopic(targetTopic);
      loadExplanation(selectedDoc.id, 'topic', targetTopic, false);
    }
  };

  const handleSelectTopicItem = (topicItem) => {
    if (!selectedDoc) return;
    setExplanationMode('topic');
    setSelectedTopic(topicItem.title);
    loadExplanation(selectedDoc.id, 'topic', topicItem.title, false);
  };

  const handlePrevNextTopic = (direction) => {
    if (!outline?.topics || outline.topics.length === 0 || !selectedTopic) return;
    const currentIndex = outline.topics.findIndex(
      (t) => t.title.toLowerCase() === selectedTopic.toLowerCase()
    );
    if (currentIndex === -1) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < outline.topics.length) {
      handleSelectTopicItem(outline.topics[nextIndex]);
    }
  };

  const handleAskQuestion = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDoc || !questionInput.trim() || askingQuestion) return;

    const q = questionInput.trim();
    setQuestionInput('');
    setAskingQuestion(true);

    try {
      const answerRes = await api.askPdfQuestion(selectedDoc.id, q);
      setQaHistory((prev) => [...prev, answerRes]);
      setTimeout(() => {
        qaBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Ask question failed:', err);
      showNotification(err.message || 'Failed to answer question grounded on PDF.', 'error');
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleOpenPdf = async (docId) => {
    try {
      await api.viewPdfDocument(docId);
    } catch (err) {
      showNotification(err.message || 'Could not open PDF file.', 'error');
    }
  };

  // Filter documents in Library view
  const coursesList = Array.from(
    new Set(documents.map((d) => d.course_name).filter(Boolean))
  );

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.readable_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.course_name && doc.course_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.extracted_topics &&
        doc.extracted_topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCourse =
      selectedSubjectFilter === 'all' || doc.course_name === selectedSubjectFilter;

    return matchesSearch && matchesCourse;
  });

  // ==========================================
  // VIEW 1: PDF LIBRARY / SELECTOR
  // ==========================================
  if (!selectedDoc) {
    return (
      <div className="pdf-explainer-page" style={{ padding: '1.75rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                AI Explainer
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, marginTop: '2px' }}>
                Understand your course materials with detailed explanations, chapter breakdowns, and examples grounded in your uploaded documents.
              </p>
            </div>
          </div>
        </div>

        {/* Simplified Search & Filter Section */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search documents by title, filename, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 1rem 0.7rem 2.6rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedSubjectFilter('all');
              setSearchQuery('');
            }}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid',
              backgroundColor:
                selectedSubjectFilter === 'all' && !searchQuery
                  ? 'var(--primary)'
                  : 'var(--bg-app)',
              borderColor:
                selectedSubjectFilter === 'all' && !searchQuery
                  ? 'var(--primary)'
                  : 'var(--border)',
              color:
                selectedSubjectFilter === 'all' && !searchQuery
                  ? '#ffffff'
                  : 'var(--text-main)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            All Documents
          </button>
        </div>

        {/* Documents Grid */}
        {loadingDocs ? (
          <div
            style={{
              padding: '4rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--primary)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Indexing and loading authorized course PDFs...
            </p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border)',
            }}
          >
            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No PDF documents found
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {searchQuery
                ? 'No documents match your search query. Try searching with different keywords.'
                : 'Upload lecture slides or textbook chapters in the Knowledge Base to activate the AI Explainer.'}
            </p>
            <button
              onClick={() => navigate('/knowledge-base')}
              style={{
                padding: '0.65rem 1.25rem',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to Knowledge Base
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.transform = 'none';
                }}
                onClick={() => handleSelectDocument(doc)}
              >
                <div>
                  {/* Top Badges */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Layers size={13} />
                      {doc.course_name || 'General Material'}
                    </span>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-app)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                    </span>
                  </div>

                  {/* Document Title */}
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      lineHeight: 1.4,
                      marginBottom: '0.4rem',
                    }}
                  >
                    {doc.readable_title}
                  </h3>

                  {/* Filename & Metadata */}
                  <p
                    style={{
                      fontSize: '0.785rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginBottom: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.filename}
                  </p>

                  {/* Extracted Topic Tags */}
                  {doc.extracted_topics && doc.extracted_topics.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.35rem',
                        marginBottom: '1rem',
                      }}
                    >
                      {doc.extracted_topics.slice(0, 3).map((topic, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.725rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface-hover)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          #{topic}
                        </span>
                      ))}
                      {doc.extracted_topics.length > 3 && (
                        <span
                          style={{
                            fontSize: '0.725rem',
                            padding: '0.2rem 0.4rem',
                            color: 'var(--text-light)',
                          }}
                        >
                          +{doc.extracted_topics.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div
                  style={{
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPdf(doc.id);
                    }}
                    style={{
                      padding: '0.5rem 0.85rem',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.borderColor = 'var(--text-muted)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <ExternalLink size={14} />
                    Open PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDocument(doc)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <Sparkles size={14} />
                    Explain PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: EXPLANATION & CHAPTER DEEP DIVE VIEW
  // ==========================================
  const activeTopicItem = outline?.topics?.find(
    (t) => t.title.toLowerCase() === (selectedTopic || '').toLowerCase()
  );

  return (
    <div
      className="pdf-explainer-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 70px)',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Top Breadcrumb & Action Toolbar */}
      <div
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => {
              setSelectedDoc(null);
              navigate('/pdf-explainer');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <ArrowLeft size={15} />
            All Documents
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedDoc.readable_title}
              </h2>
              {selectedDoc.course_name && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedDoc.course_name}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                margin: 0,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {selectedDoc.filename} • {selectedDoc.page_count} pages
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => handleOpenPdf(selectedDoc.id)}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <ExternalLink size={14} />
            Open PDF
          </button>

          <button
            type="button"
            onClick={() =>
              loadExplanation(
                selectedDoc.id,
                explanationMode,
                explanationMode === 'topic' ? selectedTopic : null,
                true
              )
            }
            disabled={regenerating || loadingExplanation}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: regenerating ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <RotateCcw
              size={14}
              style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }}
            />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>

          <button
            type="button"
            onClick={() => {
              navigate('/quiz', {
                state: {
                  fromPdfExplainer: true,
                  documentId: selectedDoc.id,
                  documentTitle: selectedDoc.readable_title,
                  courseName: selectedDoc.course_name,
                  subjectId: selectedDoc.subject_id,
                },
              });
            }}
            style={{
              padding: '0.45rem 0.95rem',
              backgroundColor: 'var(--accent-purple, #7c3aed)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <GraduationCap size={15} />
            Practice Quiz
          </button>
        </div>
      </div>

      {/* Main Content Area (Two Columns) */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Left Column: Outline / Table of Contents */}
        <aside
          style={{
            width: '320px',
            backgroundColor: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {/* Mode Switcher Tabs */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-app)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                onClick={() => handleSwitchToMode('complete')}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.5rem',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    explanationMode === 'complete' ? 'var(--primary)' : 'transparent',
                  color: explanationMode === 'complete' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                Complete PDF
              </button>
              <button
                type="button"
                onClick={() => handleSwitchToMode('topic')}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.5rem',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    explanationMode === 'topic' ? 'var(--primary)' : 'transparent',
                  color: explanationMode === 'topic' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                By Chapter / Topic
              </button>
            </div>
          </div>

          {/* Table of Contents Section */}
          <div style={{ padding: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                }}
              >
                Document Outline
              </span>
              <span
                style={{
                  fontSize: '0.725rem',
                  color: 'var(--text-light)',
                }}
              >
                {outline?.topics?.length || 0} modules
              </span>
            </div>

            {/* List of Outline Topics */}
            {outline?.topics && outline.topics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {outline.topics.map((t, idx) => {
                  const isActive =
                    explanationMode === 'topic' &&
                    selectedTopic &&
                    selectedTopic.toLowerCase() === t.title.toLowerCase();

                  return (
                    <button
                      key={t.id || idx}
                      type="button"
                      onClick={() => handleSelectTopicItem(t)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--primary)' : 'transparent',
                        backgroundColor: isActive
                          ? 'var(--primary-light)'
                          : 'var(--bg-app)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-app)';
                      }}
                    >
                      <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                        <div
                          style={{
                            fontSize: '0.825rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? 'var(--primary)' : 'var(--text-main)',
                            lineHeight: 1.35,
                          }}
                        >
                          {t.title}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                          padding: '0.15rem 0.4rem',
                          backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : 'var(--bg-surface)',
                          borderRadius: 'var(--radius-sm)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        p. {t.page_start}
                        {t.page_end && t.page_end !== t.page_start ? `–${t.page_end}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', margin: 0 }}>
                No explicit sections detected. Complete document breakdown available.
              </p>
            )}
          </div>

          {/* Document Grounding Info Banner */}
          <div
            style={{
              marginTop: 'auto',
              padding: '1rem',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--bg-app)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Document Boundary Isolation
              </span>
            </div>
            <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Explanations and citations are derived exclusively from <code>{selectedDoc.filename}</code> without mixing unrelated course data.
            </p>
          </div>
        </aside>

        {/* Right Column: Explanation Content & Document Q&A Panel */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.75rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem',
          }}
        >
          {/* Explanation Header / Navigation Bar for Mode B */}
          {explanationMode === 'topic' && activeTopicItem && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.725rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--primary)',
                  }}
                >
                  Topic Deep Dive
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {activeTopicItem.title}
                </h3>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                  Covered on Page(s) {activeTopicItem.page_start}
                  {activeTopicItem.page_end && activeTopicItem.page_end !== activeTopicItem.page_start
                    ? ` through ${activeTopicItem.page_end}`
                    : ''}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handlePrevNextTopic('prev')}
                  style={{
                    padding: '0.45rem 0.75rem',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchToMode('complete')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'var(--primary-light)',
                    border: '1px solid var(--primary-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    cursor: 'pointer',
                  }}
                >
                  Read Complete Explanation
                </button>

                <button
                  type="button"
                  onClick={() => handlePrevNextTopic('next')}
                  style={{
                    padding: '0.45rem 0.75rem',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Mode A Hero Banner */}
          {explanationMode === 'complete' && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.725rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--primary)',
                  }}
                >
                  Comprehensive Course Synthesis
                </span>
                <h3 style={{ margin: '0.2rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Complete Structured Explanation: {selectedDoc.readable_title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Sequential page-by-page breakdown covering learning objectives, algorithms, math formulas, visual schematics, and exam revision points.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: 'var(--bg-app)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  fontSize: '0.775rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Cpu size={14} style={{ color: 'var(--primary)' }} />
                <span>Engine: {explanation?.provider || 'Academic AI Engine'}</span>
              </div>
            </div>
          )}

          {/* Explanation Content Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              boxShadow: 'var(--shadow-sm)',
              minHeight: '380px',
            }}
          >
            {loadingExplanation ? (
              <div
                style={{
                  padding: '5rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.25rem',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--primary)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
                    Generating Structured Pedagogical Explanation...
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Analyzing all {selectedDoc.page_count} pages sequentially and assembling verifiable citations.
                  </p>
                </div>
              </div>
            ) : explanationError ? (
              <div
                style={{
                  padding: '3rem 2rem',
                  textAlign: 'center',
                }}
              >
                <AlertCircle size={44} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Explanation Generation Issue
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
                  {explanationError}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    loadExplanation(
                      selectedDoc.id,
                      explanationMode,
                      explanationMode === 'topic' ? selectedTopic : null,
                      true
                    )
                  }
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Retry Generation
                </button>
              </div>
            ) : explanation?.content ? (
              <div className="markdown-prose" style={{ lineHeight: 1.7, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1
                        style={{
                          fontSize: '1.45rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          borderBottom: '1px solid var(--border)',
                          paddingBottom: '0.5rem',
                          marginTop: '1.75rem',
                          marginBottom: '1rem',
                        }}
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          marginTop: '1.5rem',
                          marginBottom: '0.75rem',
                        }}
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          marginTop: '1.25rem',
                          marginBottom: '0.5rem',
                        }}
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        style={{
                          borderLeft: '4px solid var(--primary)',
                          margin: '1rem 0',
                          padding: '0.65rem 1.25rem',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--text-main)',
                          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                          fontSize: '0.9rem',
                        }}
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div style={{ overflowX: 'auto', margin: '1.25rem 0' }}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.875rem',
                          }}
                          {...props}
                        />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        style={{
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border)',
                          padding: '0.65rem 0.85rem',
                          textAlign: 'left',
                          fontWeight: 600,
                        }}
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        style={{
                          border: '1px solid var(--border)',
                          padding: '0.65rem 0.85rem',
                        }}
                        {...props}
                      />
                    ),
                    code: ({ node, inline, ...props }) =>
                      inline ? (
                        <code
                          style={{
                            backgroundColor: 'var(--bg-app)',
                            padding: '0.15rem 0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85em',
                            color: 'var(--primary)',
                          }}
                          {...props}
                        />
                      ) : (
                        <pre
                          style={{
                            backgroundColor: 'var(--bg-sidebar)',
                            color: '#f8fafc',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            overflowX: 'auto',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <code {...props} />
                        </pre>
                      ),
                  }}
                >
                  {explanation.content}
                </ReactMarkdown>

                {/* Source Citations Section */}
                {explanation.citations && explanation.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: '2.5rem',
                      paddingTop: '1.5rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      <Bookmark size={16} style={{ color: 'var(--primary)' }} />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Verified Document Citations & Page References
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {explanation.citations.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '0.4rem 0.75rem',
                            backgroundColor: 'var(--bg-app)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <Hash size={13} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Page {c.page_number}</span>
                          <span style={{ color: 'var(--text-light)' }}>•</span>
                          <span style={{ color: 'var(--text-muted)' }}>{c.filename}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Interactive Document Q&A Section ("Ask a Question About This PDF") */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <HelpCircle size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Ask a Question About This PDF
              </h3>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Targeted Q&A strictly grounded in <code>{selectedDoc.filename}</code>. Does not retrieve or mix concepts from unrelated courses.
            </p>

            {/* Quick Prompt Suggestions */}
            {outline?.topics && outline.topics.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {outline.topics.slice(0, 3).map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuestionInput(`What are the key points and procedures for ${t.title}?`);
                    }}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    💡 Explain {t.title}
                  </button>
                ))}
              </div>
            )}

            {/* Q&A Stream */}
            {qaHistory.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  paddingRight: '0.5rem',
                }}
              >
                {qaHistory.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem 1.25rem',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      Q: {item.question}
                    </div>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-main)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.answer}
                    </div>

                    {item.citations && item.citations.length > 0 && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Citations:
                        </span>
                        {item.citations.map((cit, cIdx) => (
                          <span
                            key={cIdx}
                            style={{
                              fontSize: '0.725rem',
                              padding: '0.15rem 0.45rem',
                              backgroundColor: 'var(--primary-light)',
                              color: 'var(--primary)',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 600,
                            }}
                          >
                            Page {cit.page_number}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={qaBottomRef} />
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '0.65rem' }}>
              <input
                type="text"
                placeholder={`Ask any question about ${selectedDoc.readable_title}...`}
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                disabled={askingQuestion}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={askingQuestion || !questionInput.trim()}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: askingQuestion || !questionInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: askingQuestion || !questionInput.trim() ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {askingQuestion ? (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                ) : (
                  <Send size={15} />
                )}
                Ask AI
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
