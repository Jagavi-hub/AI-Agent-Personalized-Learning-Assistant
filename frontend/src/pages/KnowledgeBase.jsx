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
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function KnowledgeBase() {
  const { showNotification } = useStudent();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
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

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const created = await api.uploadDocument(formData);
      setDocuments((prev) => [created, ...prev]);
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
      const results = await api.searchKnowledge(searchQuery, 4);
      setSearchResults(results);
      if (results.length === 0) {
        showNotification('No matching passages found above relevance threshold.', 'info');
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
          Upload syllabus materials, lecture slides, and notes for chunking, semantic indexing, and grounded AI responses.
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
              <div className="card-desc">Supported formats: PDF, TXT (Max 25 MB)</div>
            </div>
          </div>

          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
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
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {uploading ? 'Processing & Chunking Document...' : 'Click or Drag & Drop Academic Document'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Text will be parsed into overlapping semantic windows and stored for vector search.
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
                  PyPDF extracts text page-by-page. Text is segmented into 300-word chunks with 50-word overlap to preserve context across boundaries.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', backgroundColor: 'var(--accent-blue-light)', borderRadius: '6px' }}>
                <Database size={16} color="var(--accent-blue)" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  2. Semantic Vector Space
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Chunks are indexed using TF-IDF n-gram vectors with cosine similarity distance metrics, providing sub-millisecond retrieval.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '6px', backgroundColor: 'var(--success-light)', borderRadius: '6px' }}>
                <Sparkles size={16} color="var(--success)" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  3. Source-Aware Grounding
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Relevant passages are injected into the AI Agent prompt. Answers display citations to exact document files and page numbers.
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
              Semantic Search Tester (Live RAG Verification)
            </div>
            <div className="card-desc">Test real-time passage retrieval against indexed course material</div>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search query (e.g. vanishing gradient in backpropagation, learning rate, momentum)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
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
              Indexed Course Documents ({documents.length})
            </div>
            <div className="card-desc">Active knowledge bases available for student queries</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Filename</th>
                <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>File Size</th>
                <th style={{ padding: '0.75rem 1rem' }}>Indexed Chunks</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Upload Date</th>
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
                  <td style={{ padding: '0.85rem 1rem', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    <span className="badge badge-neutral">{doc.file_type}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-primary">{doc.num_chunks} chunks</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-success">{doc.status}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {new Date(doc.upload_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
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
