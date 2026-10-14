import React, { useState, useEffect } from 'react';
import {
  User,
  Save,
  CheckCircle2,
  BookOpen,
  Target,
  Sparkles,
  Layers,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { useStudent } from '../context/StudentContext';

export default function Profile() {
  const { profile, refreshProfile, showNotification } = useStudent();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    year: '',
    semester: '',
    preferred_learning_style: 'Visual & Practical',
    current_skill_level: 'Intermediate',
    enrolled_subjects: [],
    learning_goals: [],
    areas_of_interest: [],
  });

  const [saving, setSaving] = useState(false);
  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        department: profile.department || '',
        year: profile.year || '',
        semester: profile.semester || '',
        preferred_learning_style: profile.preferred_learning_style || 'Visual & Practical',
        current_skill_level: profile.current_skill_level || 'Intermediate',
        enrolled_subjects: profile.enrolled_subjects || [],
        learning_goals: profile.learning_goals || [],
        areas_of_interest: profile.areas_of_interest || [],
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showNotification('Name and email are required.', 'error');
      return;
    }

    try {
      setSaving(true);
      await api.updateProfile(formData);
      await refreshProfile();
      showNotification('Profile updated successfully! AI Agent context synchronized.', 'success');
    } catch (err) {
      showNotification('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInterest = () => {
    if (!interestInput.trim()) return;
    if (!formData.areas_of_interest.includes(interestInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        areas_of_interest: [...prev.areas_of_interest, interestInput.trim()],
      }));
    }
    setInterestInput('');
  };

  const handleRemoveInterest = (item) => {
    setFormData((prev) => ({
      ...prev,
      areas_of_interest: prev.areas_of_interest.filter((x) => x !== item),
    }));
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '950px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Student Academic Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Personal details, department info, and cognitive learning preferences informing the AI Agent.
        </p>
      </div>

      {/* Main Profile Form Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <User size={18} color="var(--primary)" />
              Learner Configuration & Academic Persona
            </div>
            <div className="card-desc">All edits persist to the backend database and calibrate agent explanations</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Row 1: Name and Email */}
          <div className="grid-2">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Student Full Name *</label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">University Email Address *</label>
              <input
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Row 2: Department, Year, Semester */}
          <div className="grid-3">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Academic Department</label>
              <input
                type="text"
                className="input-field"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Current Academic Year</label>
              <select
                className="input-field"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              >
                <option value="1st Year">1st Year (Freshman)</option>
                <option value="2nd Year">2nd Year (Sophomore)</option>
                <option value="3rd Year">3rd Year (Junior)</option>
                <option value="4th Year">4th Year (Senior)</option>
                <option value="Postgraduate">Postgraduate (Masters/PhD)</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Current Semester</label>
              <select
                className="input-field"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="4th Semester">4th Semester</option>
                <option value="5th Semester">5th Semester</option>
                <option value="6th Semester">6th Semester</option>
                <option value="7th Semester">7th Semester</option>
                <option value="8th Semester">8th Semester</option>
              </select>
            </div>
          </div>

          {/* Row 3: Learning Preferences & Skill Level */}
          <div className="grid-2">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Preferred Learning Style</label>
              <select
                className="input-field"
                value={formData.preferred_learning_style}
                onChange={(e) => setFormData({ ...formData, preferred_learning_style: e.target.value })}
              >
                <option value="Visual & Practical">Visual & Practical (Diagrams + Worked Examples)</option>
                <option value="Theoretical & Mathematical">Theoretical & Mathematical (Proofs + Derivations)</option>
                <option value="Interactive & Problem-First">Interactive & Problem-First (Active Recall + Quizzes)</option>
                <option value="Code-First">Code-First (Implementation + Traces)</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Current Skill Tier</label>
              <select
                className="input-field"
                value={formData.current_skill_level}
                onChange={(e) => setFormData({ ...formData, current_skill_level: e.target.value })}
              >
                <option value="Beginner">Beginner (Foundational)</option>
                <option value="Intermediate">Intermediate (Core Engineering)</option>
                <option value="Advanced">Advanced (Research & Optimization)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Areas of Interest Tag Editor */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Areas of Academic Focus & Research</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Add focus topic (e.g. Deep Learning, Distributed Systems, Algorithms)..."
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="btn btn-secondary"
              >
                Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {formData.areas_of_interest.map((interest, idx) => (
                <span
                  key={idx}
                  className="badge badge-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      marginLeft: '4px',
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-lg"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Profile & Update Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* AI Agent Alignment Summary Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={20} color="var(--primary)" />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong>Agent Alignment Active:</strong> The AI Agent automatically loads this profile whenever a chat or practice session starts. Explanations will use your <strong>{formData.preferred_learning_style}</strong> preference and target the <strong>{formData.current_skill_level}</strong> skill tier.
        </div>
      </div>
    </div>
  );
}
