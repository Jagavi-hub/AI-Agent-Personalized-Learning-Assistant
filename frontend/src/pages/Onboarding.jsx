import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Target,
  ArrowRight,
  Compass,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';

const SUBJECT_OPTIONS = [
  'Deep Learning & Neural Networks',
  'Database Management Systems',
  'Design & Analysis of Algorithms',
  'Operating Systems Principles',
  'Computer Networks',
  'Cloud Computing Architecture',
];

const GOAL_OPTIONS = [
  'Master Backpropagation and Gradient Descent',
  'Achieve 85%+ in Neural Networks Quiz',
  'Complete DBMS Normalization Exercises',
  'Master Graph Algorithms with Min-Heap',
  'Understand Attention and Transformers',
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, completeOnboarding, showNotification } = useStudent();

  const [step, setStep] = useState(1);
  const [department, setDepartment] = useState(user?.department || 'AI & Data Science (AI&DS)');
  const [year, setYear] = useState(user?.year || '3rd Year');
  const [semester, setSemester] = useState(user?.semester || '6th Semester');
  const [selectedSubjects, setSelectedSubjects] = useState([
    'Deep Learning & Neural Networks',
    'Database Management Systems',
  ]);
  const [selectedGoals, setSelectedGoals] = useState([
    'Master Backpropagation and Gradient Descent',
  ]);
  const [learningStyle, setLearningStyle] = useState('Visual & Practical');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [loading, setLoading] = useState(false);

  const toggleSubject = (s) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const toggleGoal = (g) => {
    setSelectedGoals((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
    );
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      await completeOnboarding({
        department,
        year,
        semester,
        enrolled_subjects: selectedSubjects,
        learning_goals: selectedGoals,
        preferred_learning_style: learningStyle,
        areas_of_interest: ['Generative AI', 'Deep Learning'],
        current_skill_level: skillLevel,
      });

      showNotification('Profile personalized! Welcome to your LearnAI Dashboard.', 'success');
      navigate('/dashboard');
    } catch (err) {
      showNotification('Failed to save onboarding settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '680px',
          width: '100%',
          padding: '2.5rem',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Progress Tracker */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
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
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Step {step} of 3
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Personalizing your learning parameters
              </div>
            </div>
          </div>

          <button
            onClick={handleSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Skip for now
          </button>
        </div>

        {/* STEP 1: Department & Academic Year */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Confirm your Academic Information
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              LearnAI aligns curriculum resources with your department syllabus.
            </p>

            <div className="input-group">
              <label className="input-label">Academic Department</label>
              <input
                type="text"
                className="input-field"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Academic Year</label>
                <select className="input-field" value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Semester</label>
                <select className="input-field" value={semester} onChange={(e) => setSemester(e.target.value)}>
                  <option value="5th Semester">5th Semester</option>
                  <option value="6th Semester">6th Semester</option>
                  <option value="7th Semester">7th Semester</option>
                  <option value="8th Semester">8th Semester</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setStep(2)} className="btn btn-primary">
                Next: Enrolled Subjects <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Enrolled Subjects */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Select Enrolled Subjects
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Select courses you are taking this semester for diagnostic quizzes and knowledge retrieval.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {SUBJECT_OPTIONS.map((sub) => {
                const isSelected = selectedSubjects.includes(sub);
                return (
                  <div
                    key={sub}
                    onClick={() => toggleSubject(sub)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <BookOpen size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {sub}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={18} color="var(--primary)" />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary">
                Back
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary">
                Next: Goals & Preferences <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Goals & Learning Style */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Goals & Pedagogical Style
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              The AI Agent uses this to calibrate explanation depth and generate practice milestones.
            </p>

            <div className="input-group">
              <label className="input-label">Preferred Learning Style</label>
              <select className="input-field" value={learningStyle} onChange={(e) => setLearningStyle(e.target.value)}>
                <option value="Visual & Practical">Visual & Practical (Worked examples + diagrams)</option>
                <option value="Theoretical & Mathematical">Theoretical & Mathematical (Proofs + Derivations)</option>
                <option value="Interactive & Problem-First">Interactive & Problem-First (Active recall + quizzes)</option>
                <option value="Code-First">Code-First (Implementation + Traces)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Initial Skill Tier</label>
              <select className="input-field" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
                <option value="Beginner">Beginner (Foundational)</option>
                <option value="Intermediate">Intermediate (Core Engineering)</option>
                <option value="Advanced">Advanced (Research & Optimization)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Priority Study Goals (Select all that apply)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {GOAL_OPTIONS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal);
                  return (
                    <div
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface-hover)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {goal}
                      </span>
                      {isSelected && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button onClick={() => setStep(2)} className="btn btn-secondary">
                Back
              </button>
              <button onClick={handleFinish} disabled={loading} className="btn btn-primary btn-lg">
                {loading ? 'Finalizing Profile...' : 'Complete & Open Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
