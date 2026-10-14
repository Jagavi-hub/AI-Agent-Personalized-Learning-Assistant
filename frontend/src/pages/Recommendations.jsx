import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  CheckCircle2,
  Clock,
  ExternalLink,
  BookOpen,
  Sparkles,
  Filter,
  FileText,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function Recommendations() {
  const navigate = useNavigate();
  const { showNotification } = useStudent();
  const [recommendations, setRecommendations] = useState([]);
  const [resources, setResources] = useState({ external_resources: [], internal_knowledge_materials: [] });
  const [filter, setFilter] = useState('active'); // 'all', 'active', 'completed'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const [recsData, resData] = await Promise.all([
        api.getRecommendations(),
        api.getResourceRecommendations(),
      ]);
      setRecommendations(recsData);
      setResources(resData);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (recId, currentStatus) => {
    try {
      const updated = await api.toggleRecommendation(recId, !currentStatus);
      setRecommendations((prev) => prev.map((r) => (r.id === recId ? updated : r)));
      showNotification(
        !currentStatus ? 'Action marked completed!' : 'Action marked pending',
        'success'
      );
    } catch (err) {
      showNotification('Failed to update recommendation', 'error');
    }
  };

  const filteredRecs = recommendations.filter((r) => {
    if (filter === 'active') return !r.is_completed;
    if (filter === 'completed') return r.is_completed;
    return true;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Personalized Learning Recommendations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Data-driven remediation plans and curated academic resources based on assessment results.
          </p>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface-hover)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          {['active', 'completed', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                backgroundColor: filter === f ? 'var(--bg-surface)' : 'transparent',
                color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended Next Actions List */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Compass size={18} color="var(--primary)" />
              Remediation & Action Items ({filteredRecs.length})
            </div>
            <div className="card-desc">Prioritized interventions targeting conceptual gaps and upcoming milestones</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredRecs.map((rec) => (
            <div
              key={rec.id}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border)',
                opacity: rec.is_completed ? 0.7 : 1,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={rec.is_completed}
                  onChange={() => handleToggle(rec.id, rec.is_completed)}
                  style={{ marginTop: '0.3rem', width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span
                      className={`badge ${
                        rec.priority === 'High'
                          ? 'badge-danger'
                          : rec.priority === 'Medium'
                          ? 'badge-warning'
                          : 'badge-primary'
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                    <span className="badge badge-neutral">{rec.topic}</span>
                    <span
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        textDecoration: rec.is_completed ? 'line-through' : 'none',
                      }}
                    >
                      {rec.title}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                    {rec.reason}
                  </p>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span>Suggested: {rec.suggested_action}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/assistant')}
                className="btn btn-sm btn-primary"
                style={{ flexShrink: 0 }}
              >
                <Sparkles size={14} /> Revise Now
              </button>
            </div>
          ))}

          {filteredRecs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No recommendations found in this category.
            </div>
          )}
        </div>
      </div>

      {/* Learning Resource Recommendations Grid */}
      <div className="grid-2">
        {/* Curated External Resources */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BookOpen size={18} color="var(--primary)" />
                Curated Academic References
              </div>
              <div className="card-desc">Verified courseware from MIT, Stanford, and documentation</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {resources.external_resources?.map((res) => (
              <a
                key={res.id}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="badge badge-primary">{res.type}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.source}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {res.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {res.reason}
                  </div>
                </div>

                <ExternalLink size={16} color="var(--primary)" style={{ flexShrink: 0, marginLeft: '0.75rem' }} />
              </a>
            ))}
          </div>
        </div>

        {/* Internal Knowledge Base Materials */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <FileText size={18} color="var(--primary)" />
                Course Knowledge Base Materials
              </div>
              <div className="card-desc">Uploaded lecture notes indexed for semantic RAG</div>
            </div>
            <button
              onClick={() => navigate('/knowledge-base')}
              className="btn btn-sm btn-secondary"
            >
              Upload Notes
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {resources.internal_knowledge_materials?.map((mat) => (
              <div
                key={mat.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="badge badge-neutral">{mat.type}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {mat.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {mat.reason}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/knowledge-base')}
                  className="btn btn-sm btn-accent"
                >
                  View
                </button>
              </div>
            ))}

            {(!resources.internal_knowledge_materials || resources.internal_knowledge_materials.length === 0) && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No uploaded documents. Upload lecture slides in Knowledge Base to enable retrieval!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
