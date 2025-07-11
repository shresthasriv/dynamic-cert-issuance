import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Project } from '../types';
import { projectApi } from '../services/api';
import StepIndicator from './StepIndicator';
import ProjectForm from './ProjectForm';
import PdfUpload from './PdfUpload';
import PdfViewer from './PdfViewer';

const CreateProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [step, setStep] = useState<'form' | 'upload' | 'coordinates'>('form');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadProject(id);
    }
  }, [isEditing, id]);

  const loadProject = async (projectId: string) => {
    try {
      setLoading(true);
      const response = await projectApi.getProjectById(projectId);
      if (response.success && response.data) {
        setProject(response.data);
        // Determine which step to show based on project state
        if (response.data.qrCoordinates) {
          setStep('coordinates');
        } else if (response.data.templatePdfPath) {
          setStep('coordinates');
        } else {
          setStep('upload');
        }
      } else {
        setError('Project not found');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProject(newProject);
    setStep('upload');
    setSuccess('Project created successfully! Now upload your certificate template.');
  };

  const handleTemplateUploaded = (updatedProject: Project) => {
    setProject(updatedProject);
    setStep('coordinates');
    setSuccess('Template uploaded successfully! Now click on the PDF to set QR code position.');
  };

  const handleCoordinatesSaved = (updatedProject: Project) => {
    setProject(updatedProject);
    setSuccess('QR coordinates saved successfully! Your project is ready for Step 2.');
  };

  const handleNextStep = () => {
    if (project) {
      navigate(`/projects/${project.id}/step2`);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Step Indicator */}
      <StepIndicator currentStep={1} />

      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">
              {isEditing ? 'Edit Project & Template' : 'Create Project & Upload Template'}
            </h2>
            <Link to="/projects" className="btn btn-secondary">
              ← Back to Projects
            </Link>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            {error}
            <button 
              onClick={clearMessages}
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button 
              onClick={clearMessages}
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Content based on current step */}
        {step === 'form' && (
          <ProjectForm 
            project={project}
            onProjectCreated={handleProjectCreated}
            onError={setError}
          />
        )}

        {step === 'upload' && project && (
          <PdfUpload 
            project={project}
            onTemplateUploaded={handleTemplateUploaded}
            onError={setError}
          />
        )}

        {step === 'coordinates' && project && project.templatePdfPath && (
          <div>
            <PdfViewer 
              project={project}
              onCoordinatesSaved={handleCoordinatesSaved}
              onError={setError}
            />
            
            {/* Next Step Button */}
            {project.qrCoordinates && (
              <div style={{ 
                marginTop: '2rem', 
                padding: '1rem', 
                backgroundColor: '#f8fafc', 
                borderRadius: '0.5rem',
                textAlign: 'center'
              }}>
                <h3 style={{ marginBottom: '1rem' }}>✅ Step 1 Complete!</h3>
                <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
                  Your project is set up and ready for bulk certificate processing.
                </p>
                <button 
                  onClick={handleNextStep}
                  className="btn btn-primary"
                  style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
                >
                  Continue to Step 2: Upload Certificate Batch →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProject; 