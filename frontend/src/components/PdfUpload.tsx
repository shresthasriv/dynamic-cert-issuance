/**
 * PdfUpload.tsx
 * 
 * PDF template upload component for Step 1 of the certificate creation process.
 * Handles PDF file validation, upload progress, and provides drag & drop functionality.
 * Displays project summary and upload status with comprehensive error handling.
 * 
 * Features:
 * - Drag & drop PDF upload with visual feedback
 * - File validation (type, size limits)
 * - Upload progress indication
 * - Project information display
 * - Error handling and user feedback
 */
import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { projectApi } from '../services/api';

/**
 * Props interface for PdfUpload component
 */
interface PdfUploadProps {
  /** Current project to upload template for */
  project: Project;
  /** Callback fired when template is successfully uploaded */
  onTemplateUploaded: (project: Project) => void;
  /** Callback fired when an error occurs */
  onError: (error: string) => void;
}

/**
 * PdfUpload Component
 * 
 * Provides an interface for uploading certificate template PDFs with drag & drop support.
 * Validates file type and size, shows upload progress, and handles errors gracefully.
 * Displays current project information for context.
 */
const PdfUpload: React.FC<PdfUploadProps> = ({ project, onTemplateUploaded, onError }) => {
  // Upload state management
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Reference to hidden file input for programmatic triggering
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validates uploaded PDF file against requirements
   * Checks file type (PDF only) and size limits (10MB max)
   * 
   * @param {File} file - The file to validate
   * @returns {string | null} Error message if validation fails, null if valid
   */
  const validateFile = (file: File): string | null => {
    // Check file type - must be PDF
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }
    
    // Check file size - 10MB maximum
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    return null;
  };

  /**
   * Handles the PDF file upload process
   * Validates file, uploads to API, and handles success/error responses
   * 
   * @param {File} file - The PDF file to upload
   */
  const handleFileUpload = async (file: File) => {
    // Validate file before attempting upload
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    try {
      setUploading(true);
      const response = await projectApi.uploadTemplate(project.id, file);
      
      if (response.success && response.data) {
        // Success - notify parent component with updated project data
        onTemplateUploaded(response.data);
      } else {
        // API returned error
        onError(response.error || 'Failed to upload template');
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      onError('Failed to upload template. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handles file selection from file input element
   * Triggered when user selects file via browse button
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Handles drag and drop file upload
   * Processes dropped files and initiates upload
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Handles drag over events for visual feedback
   * Shows drag over state to indicate drop zone is active
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  /**
   * Handles drag leave events to reset visual state
   * Removes drag over styling when user drags away
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  /**
   * Triggers the hidden file input when upload area is clicked
   * Provides click-to-upload functionality
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      {/* Component Header */}
      <h3 className="form-section-title">
        📄 Upload Certificate Template
      </h3>

      {/* Project Summary Display */}
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

      {/* File Upload Area with drag & drop support */}
      <div
        className={`file-upload ${dragOver ? 'dragover' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {/* Hidden file input for programmatic access */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />

        {/* Upload area icon - changes based on upload state */}
        <div className="file-upload-icon">
          {uploading ? (
            <div className="spinner" />
          ) : (
            '📄'
          )}
        </div>

        {/* Upload area text content - changes based on state */}
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

      {/* Current Template Information Display */}
      {project.templatePdfPath && (
        <div className="current-template">
          <h4 className="current-template-title">
            ✅ Template Uploaded
          </h4>
          <div className="current-template-info">
            <div>Current template is ready for coordinate setting</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Upload a new file to replace the current template
            </div>
          </div>
        </div>
      )}

      {/* Help Information */}
      <div className="info-box">
        <h4 className="info-box-title">💡 Template Requirements</h4>
        <ul className="info-box-list">
          <li>Upload a PDF file that will serve as your certificate template</li>
          <li>This template will be used for all certificates in your batch</li>
          <li>After upload, you'll set the QR code position on the template</li>
          <li>Maximum file size: 10MB</li>
        </ul>
      </div>
    </div>
  );
};

export default PdfUpload; 