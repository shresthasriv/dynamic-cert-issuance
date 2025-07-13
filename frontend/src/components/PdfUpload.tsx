import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { projectApi } from '../services/api';

interface PdfUploadProps {
  project: Project;
  onTemplateUploaded: (project: Project) => void;
  onError: (error: string) => void;
}

const PdfUpload: React.FC<PdfUploadProps> = ({ project, onTemplateUploaded, onError }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    try {
      setUploading(true);
      const response = await projectApi.uploadTemplate(project.id, file);
      
      if (response.success && response.data) {
        onTemplateUploaded(response.data);
      } else {
        onError(response.error || 'Failed to upload template');
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      onError('Failed to upload template. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <h3 className="form-section-title">
        📄 Upload Certificate Template
      </h3>

      {/* Project Summary */}
      <div className="project-summary">
        <h4 className="project-summary-title">
          📋 Project: {project.name}
        </h4>
        <div className="project-summary-details">
          <div>Issuer: {project.issuer}</div>
          <div>Issue Date: {new Date(project.issueDate).toLocaleDateString()}</div>
          {project.description && <div>Description: {project.description}</div>}
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`file-upload ${dragOver ? 'dragover' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />

        <div className="file-upload-icon">
          {uploading ? (
            <div className="spinner" />
          ) : (
            '📄'
          )}
        </div>

        <div className="file-upload-text">
          {uploading ? (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Uploading template...
              </div>
              <div>Please wait while we process your PDF</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                {dragOver ? 'Drop your PDF here' : 'Click to upload or drag & drop'}
              </div>
              <div>PDF files only, up to 10MB</div>
            </div>
          )}
        </div>
      </div>

      {/* Current Template Info */}
      {project.templatePdfPath && (
        <div className="alert alert-success" style={{ marginTop: '2rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>
              ✅ Template Uploaded
            </h4>
            <div style={{ fontSize: '0.875rem' }}>
              Your certificate template has been uploaded successfully. 
              You can upload a new one to replace it, or proceed to set QR code coordinates.
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="info-box" style={{ marginTop: '2rem' }}>
        <h4 className="info-box-title">💡 Template Requirements</h4>
        <ul className="info-box-list">
          <li>Upload a PDF file that will serve as your certificate template</li>
          <li>This template will be used for all certificates in this batch</li>
          <li>Make sure the template has space for a QR code (you'll set its position next)</li>
          <li>File must be in PDF format and less than 10MB</li>
          <li>The template should contain placeholder text that will be replaced with actual certificate data</li>
        </ul>
      </div>
    </div>
  );
};

export default PdfUpload; 