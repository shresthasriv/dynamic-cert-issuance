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
    // Check file type
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }

    // Check file size (10MB limit)
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
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
        📄 Upload Certificate Template
      </h3>

      {/* Project Summary */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
        border: '1px solid #e2e8f0'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
          📋 Project: {project.name}
        </h4>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          <div>Issuer: {project.issuer}</div>
          <div>Issue Date: {new Date(project.issueDate).toLocaleDateString()}</div>
          {project.description && <div>Description: {project.description}</div>}
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`file-upload ${dragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        style={{
          opacity: uploading ? 0.6 : 1,
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}
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
            <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
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
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#dcfce7',
          borderRadius: '0.5rem',
          border: '1px solid #bbf7d0'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>
            ✅ Template Uploaded
          </h4>
          <div style={{ fontSize: '0.875rem', color: '#166534' }}>
            Your certificate template has been uploaded successfully. 
            You can upload a new one to replace it, or proceed to set QR code coordinates.
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#eff6ff',
        borderRadius: '0.5rem',
        borderLeft: '4px solid #3b82f6'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>💡 Template Requirements</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#374151' }}>
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