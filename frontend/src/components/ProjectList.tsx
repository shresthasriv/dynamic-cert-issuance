import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { projectApi } from '../services/api';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Certificate Projects</h2>
            <Link to="/projects/new" className="btn btn-primary">
              + Create New Project
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h3>No projects yet</h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Create your first certificate project to get started
            </p>
            <Link to="/projects/new" className="btn btn-primary">
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>
                      Project Name
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>
                      Issuer
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>
                      Issue Date
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{project.name}</div>
                          {project.description && (
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {project.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{project.issuer}</td>
                      <td style={{ padding: '0.75rem' }}>{formatDate(project.issueDate)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: project.templatePdfPath 
                            ? (project.qrCoordinates ? '#dcfce7' : '#fef3c7')
                            : '#fef2f2',
                          color: project.templatePdfPath 
                            ? (project.qrCoordinates ? '#166534' : '#92400e')
                            : '#991b1b'
                        }}>
                          {project.templatePdfPath 
                            ? (project.qrCoordinates ? 'Ready' : 'Template Uploaded')
                            : 'Setup Required'
                          }
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link 
                            to={`/projects/${project.id}/step1`} 
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                          >
                            {project.templatePdfPath ? 'Edit' : 'Setup'}
                          </Link>
                          {project.templatePdfPath && project.qrCoordinates && (
                            <Link 
                              to={`/projects/${project.id}/step2`} 
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                            >
                              Next Step
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList; 