import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectApi } from '../services/api';

interface ProjectFormProps {
  project: Project | null;
  onProjectCreated: (project: Project) => void;
  onError: (error: string) => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onProjectCreated, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    issuer: '',
    issueDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        issuer: project.issuer,
        issueDate: project.issueDate,
      });
    }
  }, [project]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }

    if (!formData.issuer.trim()) {
      newErrors.issuer = 'Issuer is required';
    }

    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    } else {
      const selectedDate = new Date(formData.issueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.issueDate = 'Issue date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await projectApi.createProject({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        issuer: formData.issuer.trim(),
        issueDate: formData.issueDate,
      });

      if (response.success && response.data) {
        onProjectCreated(response.data);
      } else {
        onError(response.error || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      if (error.response?.status === 409) {
        setErrors({ name: 'A project with this name already exists' });
      } else {
        onError('Failed to create project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div>
      <h3 className="form-section-title">
        📋 Project Information
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Project Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`form-input ${errors.name ? 'form-input-error' : ''}`}
            placeholder="e.g., Computer Science Graduation 2024"
            disabled={loading}
          />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-input form-textarea"
            placeholder="Optional description of the certificate project..."
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="issuer" className="form-label">
            Issuer *
          </label>
          <input
            type="text"
            id="issuer"
            name="issuer"
            value={formData.issuer}
            onChange={handleChange}
            className={`form-input ${errors.issuer ? 'form-input-error' : ''}`}
            placeholder="e.g., University of Technology"
            disabled={loading}
          />
          {errors.issuer && <div className="form-error">{errors.issuer}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="issueDate" className="form-label">
            Issue Date *
          </label>
          <input
            type="date"
            id="issueDate"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleChange}
            className={`form-input ${errors.issueDate ? 'form-input-error' : ''}`}
            disabled={loading}
            min={new Date().toISOString().split('T')[0]}
          />
          {errors.issueDate && <div className="form-error">{errors.issueDate}</div>}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Creating...
              </>
            ) : (
              '📝 Create Project'
            )}
          </button>
        </div>
      </form>

      <div className="info-box">
        <h4 className="info-box-title">💡 Instructions</h4>
        <ul className="info-box-list">
          <li>Choose a unique project name that describes your certificate batch</li>
          <li>The issuer will appear on all certificates</li>
          <li>Set the official issue date for all certificates in this batch</li>
          <li>After creating the project, you'll upload your PDF template</li>
        </ul>
      </div>
    </div>
  );
};

export default ProjectForm; 