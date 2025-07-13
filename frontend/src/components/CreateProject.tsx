import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Project } from '../types';
import { projectApi } from '../services/api';
import StepIndicator from './StepIndicator';
import ProjectForm from './ProjectForm';
import PdfUpload from './PdfUpload';
import PdfViewer from './PdfViewer';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

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
        if (!response.data.templatePdfPath) {
          setStep('upload');
        } else {
          setStep('coordinates');
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
          <div className="header-flex">
            <h2 className="card-title">
              {isEditing ? 'Edit Project & Template' : 'Create Project & Upload Template'}
            </h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/projects" className="btn btn-secondary">
                <ArrowLeft size={16} />
                Back to Projects
              </Link>
              {project && project.qrCoordinates && (
                <button 
                  onClick={handleNextStep}
                  className="btn btn-primary"
                >
                  Continue to Step 2
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            {error}
            <button 
              onClick={clearMessages}
              className="alert-close"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button 
              onClick={clearMessages}
              className="alert-close"
            >
              <X size={18} />
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
          <PdfViewer 
            project={project}
            onCoordinatesSaved={handleCoordinatesSaved}
            onError={setError}
          />
        )}
      </div>
    </div>
  );
};

export default CreateProject; 