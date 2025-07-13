import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { projectApi } from '../services/api';
import { Plus, Edit, ArrowRight, Trash2, FolderOpen, Loader2 } from 'lucide-react';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getAllProjects();
      if (response.success) {
        setProjects(response.data || []);
      } else {
        setError(response.error || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the project "${projectName}"?\n\n` +
      'This will permanently delete:\n' +
      '• The project and all its data\n' +
      '• All uploaded batches and certificates\n' +
      '• All associated files\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmed) return;

    try {
      setDeletingProjectId(projectId);
      setError(null);
      setSuccess(null);

      const response = await projectApi.deleteProject(projectId);
      
      if (response.success) {
        setSuccess(`Project "${projectName}" deleted successfully`);
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        setError(response.error || 'Failed to delete project');
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      setError(error.message || 'Failed to delete project');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (project: Project) => {
    if (!project.templatePdfPath) {
      return { className: 'status-badge status-setup', text: 'Setup Required' };
    }
    if (!project.qrCoordinates) {
      return { className: 'status-badge status-template', text: 'Template Uploaded' };
    }
    return { className: 'status-badge status-ready', text: 'Ready' };
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
      <div className="card">
        <div className="card-header">
          <div className="header-flex">
            <h1 className="card-title" style={{ fontSize: '1.5rem' }}>Your Projects</h1>
            <Link to="/projects/new" className="btn btn-primary">
              <Plus size={18} />
              Create New Project
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={clearMessages} className="alert-close">×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button onClick={clearMessages} className="alert-close">×</button>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="empty-projects">
            <FolderOpen size={48} className="empty-icon" />
            <h2>No Projects Found</h2>
            <p className="empty-description">
              Get started by creating your first certificate project.
            </p>
            <Link to="/projects/new" className="btn btn-primary">
              <Plus size={18} />
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="projects-table-container">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Issuer</th>
                  <th>Issue Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const statusBadge = getStatusBadge(project);
                  const isDeleting = deletingProjectId === project.id;
                  
                  return (
                    <tr key={project.id}>
                      <td>
                        <div className="project-name-cell">
                          <div className="project-name">{project.name}</div>
                          {project.description && (
                            <div className="project-description-small">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="project-issuer">{project.issuer}</td>
                      <td className="project-date">{formatDate(project.issueDate)}</td>
                      <td>
                        <span className={statusBadge.className}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td>
                        <div className="project-actions">
                          <Link 
                            to={`/projects/${project.id}/step1`} 
                            className="btn btn-sm btn-secondary"
                          >
                            <Edit size={14} />
                            {project.templatePdfPath ? 'Edit' : 'Setup'}
                          </Link>
                          {project.templatePdfPath && project.qrCoordinates && (
                            <Link 
                              to={`/projects/${project.id}/step2`} 
                              className="btn btn-sm btn-primary"
                            >
                              Next Step
                              <ArrowRight size={14} />
                            </Link>
                          )}
                          <button
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            disabled={isDeleting}
                            className="btn btn-sm btn-danger"
                            title="Delete project permanently"
                          >
                            {isDeleting ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList; 