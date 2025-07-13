import React from 'react';
import { Link } from 'react-router-dom';
import StepIndicator from './StepIndicator';
import { Project } from '../types';
import { ArrowLeft } from 'lucide-react';

interface DashboardHeaderProps {
  project: Project;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ project }) => {
  return (
    <div className="dashboard-header">
      <div className="header-content">
        <div className="header-left">
          <div className="project-info">
            <h1>{project.name}</h1>
            <p className="project-description">{project.description}</p>
            <div className="project-meta">
              <span>Issuer: {project.issuer}</span>
              <span>Issue Date: {new Date(project.issueDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <Link 
            to={`/projects/${project.id}/step2`} 
            className="btn btn-secondary"
          >
            <ArrowLeft size={16} />
            Back to Upload
          </Link>
        </div>
      </div>
      
      <StepIndicator currentStep={3} />
    </div>
  );
};

export default DashboardHeader; 