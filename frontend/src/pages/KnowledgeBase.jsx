import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function KnowledgeBase() {
  const { showNotification } = useStudent();
  const [documents, setDocuments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [uploading, setUploading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubjectId, setSearchSubjectId] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingDocs(true);
      const [docs, subjs] = await Promise.all([
        api.getDocuments(),
        api.getSubjects().catch(() => []),
      ]);
      setDocuments(docs || []);
      setSubjects(subjs || []);
      if (subjs && subjs.length > 0 && !uploadSubjectId) {
        setUploadSubjectId(String(subjs[0].id));
      }
    } catch (err) {
      console.error('Failed to load knowledge base data:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') {
      showNotification('Only PDF and TXT files are accepted.', 'error');
      return;
    }

    if (uploadSubjectId === '__new__' && !newCourseName.trim()) {
      showNotification('Please enter a course name for the new course.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      if (uploadSubjectId === '__new__') {
        formData.append('new_course_name', newCourseName.trim());
        if (newCourseCode.trim()) {
          formData.append('new_course_code', newCourseCode.trim());
        }
      } else if (uploadSubjectId) {
        formData.append('subject_id', uploadSubjectId);
      }

      const created = await api.uploadDocument(formData);
      // Reload both documents and subjects to maintain full dynamic synchronization across the system
      const [updatedDocs, updatedSubjs] = await Promise.all([
        api.getDocuments(),
        api.getSubjects().catch(() => []),
      ]);
      setDocuments(updatedDocs || []);
      setSubjects(updatedSubjs || []);
      if (uploadSubjectId === '__new__') {
        setUploadSubjectId(created.subject_id ? String(created.subject_id) : '');
        setNewCourseName('');
        setNewCourseCode('');
      }
      showNotification(`"${file.name}" indexed successfully with ${created.num_chunks} chunks!`, 'success');
    } catch (err) {
      showNotification(err.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Delete "${filename}" and purge all associated semantic chunks?`)) return;

    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      showNotification(`"${filename}" removed from knowledge base`, 'info');
    } catch (err) {
      showNotification('Failed to delete document', 'error');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const subId = searchSubjectId ? Number(searchSubjectId) : null;
      const results = await api.searchKnowledge(searchQuery, 4, subId);
      setSearchResults(results);
      if (results.length === 0) {
        showNotification('No matching passages found above relevance threshold for this course filter.', 'info');
      }
    } catch (err) {
      showNotification('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Course Knowledge Base & Retrieval (RAG)</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Grounding AI responses, quizzes, and agent reasoning in curriculum courses and authentic syllabus materials.
        </p>
      </div>

      {/* Upload Zone & Stats Card */}
      <div className="grid-2">
        {/* Upload Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Upload size={18} color="var(--primary)" />
                Ingest Academic Material
              </div>
              <div className="card-desc">Supported formats: PDF, TXT (Max 20 MB)</div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
              Assign to Academic Course:
            </label>
            <select
              value={uploadSubjectId}
              onChange={(e) => setUploadSubjectId(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="">Auto-Detect from Filename</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name} ({s.documents?.length || 0} {s.documents?.length === 1 ? 'doc' : 'docs'})
                </option>
              ))}
              <option value="__new__">+ Create New Academic Course...</option>
            </select>

            {uploadSubjectId === '__new__' && (
              <div style={{ marginTop: '0.75rem', padding: '0.875rem', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>
                  New Course Details
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                    Course Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Big Data Analytics, Cryptography"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8125rem', padding: '0.45rem 0.65rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                    Course Code (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 22AI602 (auto-generated if empty)"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8125rem', padding: '0.45rem 0.65rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '2rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface-hover)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'border-color 0.2s ease',
            }}
          >
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {uploading ? 'Processing & Chunking Document...' : 'Click or Drag & Drop Academic Document'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Text will be parsed into overlapping semantic windows and indexed for TF-IDF vector retrieval.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Retrieval Pipeline Info */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Cpu size={18} color="var(--primary)" />
                RAG Pipeline Architecture
              </div>
              <div className="card-desc">Grounding AI responses in authentic course content</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', backgroundColor: 'var(--primary-light)', borderRadius: '6px' }}>
                <Layers size={16} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  1. Extraction & Window Chunking
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  PyPDF extracts text page-by-page from the 4 academic PDFs. Text is segmented into 300-word chunks with 50-word overlap to preserve context across boundaries.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', backgroundColor: 'var(--accent-blue-light)', borderRadius: '6px' }}>
                <Database size={16} color="var(--accent-blue)" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  2. TF-IDF Vector Retrieval & Cosine Distance
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Chunks are indexed using scikit-learn TF-IDF n-gram vectors (1-2 ngrams, 5000 features) with cosine distance metrics, providing sub-millisecond course-isolated retrieval.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', backgroundColor: 'var(--success-light)', borderRadius: '6px' }}>
                <Sparkles size={16} color="var(--success)" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  3. Source-Aware Grounding & Course Isolation
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Relevant passages are filtered strictly to the selected course. Answers cite the exact PDF file, unit, and page numbers.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Semantic Search Tester Sandbox */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Search size={18} color="var(--primary)" />
              Semantic Search Tester (Live Course RAG Verification)
            </div>
            <div className="card-desc">Test real-time passage retrieval against the 4 indexed course PDFs</div>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <select
            value={searchSubjectId}
            onChange={(e) => setSearchSubjectId(e.target.value)}
            className="input-field"
            style={{ width: '220px' }}
          >
            <option value="">All Courses</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}: {s.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="input-field"
            placeholder="Search query (e.g. well-posed learning problem, Turing test, latency bandwidth, cloud IaaS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '240px' }}
          />
          <button type="submit" disabled={searching || !searchQuery.trim()} className="btn btn-primary">
            {searching ? 'Retrieving...' : 'Test Retrieval'}
          </button>
        </form>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Top {searchResults.length} Matching Passage(s):
            </div>
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {res.filename}
                    </span>
                    <span className="badge badge-neutral">Page {res.page_number}</span>
                  </div>
                  <span className="badge badge-primary">Relevance: {res.score}</span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{res.text}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <FileText size={18} color="var(--primary)" />
              Indexed Course Documents & Materials ({documents.length})
            </div>
            <div className="card-desc">Active course repositories available for student queries and quizzes</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Filename</th>
                <th style={{ padding: '0.75rem 1rem' }}>Curriculum Course</th>
                <th style={{ padding: '0.75rem 1rem' }}>Indexed Chunks</th>
                <th style={{ padding: '0.75rem 1rem' }}>Syllabus Topics</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>File Size</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} color="var(--primary)" />
                      {doc.filename}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-primary">
                      {doc.course_name || 'Curriculum Material'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-neutral">{doc.num_chunks} chunks</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', maxWidth: '280px' }}>
                    {doc.extracted_topics && doc.extracted_topics.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {doc.extracted_topics.slice(0, 2).map((top, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.6875rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-surface-hover)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-main)',
                            }}
                          >
                            {top}
                          </span>
                        ))}
                        {doc.extracted_topics.length > 2 && (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            +{doc.extracted_topics.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-success">{doc.status}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className="btn btn-sm"
                      style={{ color: 'var(--danger)', background: 'transparent' }}
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && !loadingDocs && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No documents uploaded. Upload a PDF or TXT file above to build your course knowledge base.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
