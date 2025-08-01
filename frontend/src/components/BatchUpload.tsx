/**
 * BatchUpload.tsx
 * 
 * Step 2 component for uploading and validating ZIP files containing certificate PDFs
 * and Excel mapping files. Handles batch upload validation, file processing, and 
 * displays detailed validation results to guide users through the upload process.
 * 
 * ZIP File Requirements:
 * - One Excel file (.xlsx or .xls) with certificate mapping
 * - PDF files named exactly as specified in Excel
 * - Maximum 250 certificates per batch
 * - ZIP file size limit: 100MB
 * 
 * Features:
 * - Drag & drop file upload with validation
 * - Real-time upload progress tracking
 * - Comprehensive validation result display
 * - Automatic batch breakdown for processing
 * - Support for re-uploads and error correction
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Batch } from '../types';
import { projectApi } from '../services/api';
import StepIndicator from './StepIndicator';
import {
  ArrowLeft,
  ArrowRight,
  X,
  ClipboardList,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  FileX2,
  FileUp,
  Clock,
  Package,
  ListChecks,
  FileWarning,
} from 'lucide-react';

/**
 * BatchUpload Component
 * 
 * Main component for Step 2 of the certificate issuance process. Allows users to
 * upload ZIP files containing certificate PDFs and mapping Excel files, validates
 * the content, and provides detailed feedback on the validation results.
 */
const BatchUpload: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Core data state
  const [project, setProject] = useState<any | null>(null); 
  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  
  // UI state management
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  
  // Message state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Effect to load project and batch data when component mounts
   * or when project ID changes in the URL
   */
  useEffect(() => {
    if (id) {
      loadProjectAndBatches(id);
    }
  }, [id]);

  /**
   * Loads project data and existing batches from the API
   * Validates that the project is ready for batch upload (has template and coordinates)
   * 
   * @param {string} projectId - The project ID from URL parameters
   */
  const loadProjectAndBatches = async (projectId: string) => {
    try {
      setLoading(true);
      
      // Load project and batches in parallel for better performance
      const [projectResponse, batchesResponse] = await Promise.all([
        projectApi.getProjectById(projectId),
        projectApi.getBatches(projectId)
      ]);

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data);
        
        // Check if project is ready for batch upload - must have template and QR coordinates
        if (!projectResponse.data.templatePdfPath || !projectResponse.data.qrCoordinates) {
          setError('Project must have template PDF and QR coordinates before uploading batch. Please complete Step 1 first.');
          return;
        }
      } else {
        setError('Project not found');
        return;
      }

      if (batchesResponse.success && batchesResponse.data) {
        setBatches(batchesResponse.data);
        // Set the most recent batch as current if it exists
        if (batchesResponse.data.length > 0) {
          setCurrentBatch(batchesResponse.data[0]);
        }
      }

    } catch (error) {
      console.error('Error loading project and batches:', error);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validates uploaded file before processing
   * Checks file type, size, and other requirements
   * 
   * @param {File} file - The uploaded file to validate
   * @returns {string | null} Error message if validation fails, null if valid
   */
  const validateFile = (file: File): string | null => {
    // Check file type - allow various ZIP mime types for browser compatibility
    const allowedTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
      'application/octet-stream' // Some browsers may use this for ZIP files
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.zip')) {
      return 'Only ZIP files are allowed. Please upload a ZIP file containing your certificate PDFs and Excel mapping file.';
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 100MB. Please reduce your ZIP file size.';
    }

    return null;
  };

  /**
   * Handles the file upload process including validation and API call
   * Shows upload progress and processes validation results
   * 
   * @param {File} file - The file to upload
   */
  const handleFileUpload = async (file: File) => {
    // Validate file before uploading
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!project) {
      setError('Project not found');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      clearMessages();

      // Upload file with progress tracking
      const response = await projectApi.uploadBatch(
        project.id, 
        file,
        (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      );

      if (response.success && response.data) {
        // Update batch state with new upload
        setCurrentBatch(response.data);
        setBatches(prev => [response.data!, ...prev.filter(b => b.id !== response.data!.id)]);
        
        // Show appropriate message based on validation results
        if (response.data.validationResults?.isValid) {
          setSuccess('Batch ZIP uploaded and validated successfully! All files are ready for processing.');
        } else {
          setError('Batch ZIP uploaded but validation failed. Please check the validation errors below and re-upload a corrected ZIP file.');
        }
      } else {
        setError(response.error || 'Failed to upload batch ZIP');
      }
    } catch (error: any) {
      console.error('Error uploading batch:', error);
      setError(error.message || 'Failed to upload batch ZIP. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handles file selection from file input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Handles drag and drop file upload
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
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  /**
   * Handles drag leave events to reset visual state
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  /**
   * Triggers file input click when upload area is clicked
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Clears error and success messages
   */
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  /**
   * Navigates to Step 3 if current batch is valid
   */
  const proceedToStep3 = () => {
    if (project && currentBatch?.validationResults?.isValid) {
      navigate(`/projects/${project.id}/step3`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Project not found state
  if (!project) {
    return (
      <div className="card">
        <div className="alert alert-error">
          Project not found. Please check the URL and try again.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Step Indicator */}
      <StepIndicator currentStep={2} />

      {/* Main Content Card */}
      <div className="card">
        {/* Header with navigation */}
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Upload Certificate Batch</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to={`/projects/${project.id}/step1`} className="btn btn-secondary">
                <ArrowLeft size={16} />
                Back to Step 1
              </Link>
              {currentBatch && currentBatch.validationResults?.isValid && (
                <button
                  onClick={proceedToStep3}
                  className="btn btn-primary"
                >
                  Continue to Step 3
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={clearMessages} className="alert-close">
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button onClick={clearMessages} className="alert-close">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Project Summary - shows current project status */}
        <div className="project-summary">
          <h3 className="project-summary-title">
            <ClipboardList size={18} style={{ marginRight: '0.5rem' }} />
            Project: {project.name}
          </h3>
          <div className="project-summary-details">
            <div>Issuer: {project.issuer}</div>
            <div>Issue Date: {new Date(project.issueDate).toLocaleDateString()}</div>
            <div>Template: ✅ Uploaded</div>
            <div>QR Position: ✅ Set</div>
          </div>
        </div>

        {/* ZIP File Requirements Information */}
        <div className="info-box">
          <h4 className="info-box-title">
            <Package size={18} style={{ marginRight: '0.5rem' }} />
            ZIP File Requirements
          </h4>
          <ul className="info-box-list">
            <li>One Excel file (.xlsx or .xls) with certificate mapping</li>
            <li>Excel must contain columns: <strong>certificateId</strong> and <strong>filename</strong></li>
            <li>PDF files named exactly as specified in the Excel file</li>
            <li>Maximum 250 certificates per batch</li>
            <li>ZIP file size limit: 100MB</li>
          </ul>
        </div>

        {/* File Upload Area with drag & drop support */}
        <div
          className={`file-upload ${dragOver ? 'dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          style={{
            marginBottom: '2rem',
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto'
          }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />

          {/* Upload area icon */}
          <div className="file-upload-icon">
            {uploading ? <div className="spinner" /> : <UploadCloud />}
          </div>

          {/* Upload state content */}
          {uploading ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Uploading and processing ZIP file...</strong>
              </div>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                backgroundColor: '#e5e7eb',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                marginBottom: '0.5rem'
              }}>
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    backgroundColor: '#3b82f6',
                    height: '0.5rem',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div className="file-upload-text">
                {uploadProgress}% complete
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Drop your ZIP file here or click to browse</strong>
              </div>
              <div className="file-upload-text">
                Supported format: ZIP files up to 100MB
              </div>
            </div>
          )}
        </div>

        {/* Current Batch Validation Results */}
        {currentBatch && (
          <BatchValidationResults 
            batch={currentBatch} 
            onReupload={handleClick}
            onProceedToStep3={proceedToStep3}
          />
        )}

        {/* Previous Batch History */}
        {batches.length > 1 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#ffffff' }}>Previous Batch Uploads</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {batches.slice(1).map((batch) => (
                <div 
                  key={batch.id} 
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#2d3748',
                    borderRadius: '0.375rem',
                    border: '1px solid #4a5568',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#ffffff'
                  }}
                >
                  <div>
                    <strong>{batch.name}</strong>
                    <span style={{ marginLeft: '0.5rem', color: '#a0aec0' }}>
                      {batch.totalCertificates} certificates • {batch.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#a0aec0' }}>
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * BatchValidationResults Component
 * 
 * Displays detailed validation results for an uploaded batch, including:
 * - Validation status (passed/failed)
 * - Summary statistics (total, valid, invalid entries)
 * - Processing time estimates
 * - Automatic batch breakdown
 * - Detailed error messages
 * - Missing/extra PDF file lists
 */
interface BatchValidationResultsProps {
  /** The batch to display validation results for */
  batch: Batch;
  /** Callback to trigger re-upload */
  onReupload: () => void;
  /** Callback to proceed to Step 3 */
  onProceedToStep3: () => void;
}

const BatchValidationResults: React.FC<BatchValidationResultsProps> = ({ 
  batch, 
  onReupload, 
}) => {
  const validation = batch.validationResults;
  
  // Don't render if no validation results available
  if (!validation) {
    return null;
  }

  /**
   * Formats processing time from minutes to human-readable string
   * 
   * @param {number} minutes - Time in minutes
   * @returns {string} Formatted time string
   */
  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 minute';
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={`validation-results ${validation.isValid ? 'validation-success' : 'validation-error'}`}>
      {/* Validation Header with Status */}
      <div className="validation-header">
        <div className="validation-icon">
          {validation.isValid ? <FileCheck2 /> : <FileX2 />}
        </div>
        <h3 className="validation-title">
          {validation.isValid ? 'Validation Passed' : 'Validation Failed'}
        </h3>
      </div>

      {/* Validation Summary Statistics */}
      <div className="validation-summary">
        <div className="summary-item">
          <div className="summary-label">Total Entries</div>
          <div className="summary-value">{validation.totalEntries}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Valid Records</div>
          <div className="summary-value success-text">{validation.validRecords}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Invalid Records</div>
          <div className="summary-value error-text">{validation.invalidRecords}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">
            <Clock size={14} style={{ marginRight: '0.25rem' }} />
            Estimated Time
          </div>
          <div className="summary-value">{formatTime(validation.estimatedProcessingTime)}</div>
        </div>
      </div>

      {/* Automatic Batch Breakdown for Processing */}
      {validation.batchBreakdown.length > 0 && (
        <div className="batch-breakdown">
          <h4 className="breakdown-title">
            <ListChecks size={18} style={{ marginRight: '0.5rem' }} />
            Automatic Batch Breakdown
          </h4>
          <div className="breakdown-items">
            {validation.batchBreakdown.map((breakdown) => (
              <div key={breakdown.batchNumber} className="breakdown-item">
                Batch {breakdown.batchNumber}: {breakdown.certificateCount} certs 
                <span className="breakdown-time"> ({formatTime(breakdown.estimatedTime)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Error Details */}
      {validation.errors.length > 0 && (
        <div className="validation-errors">
          <h4 className="error-title">
            <AlertTriangle size={18} style={{ marginRight: '0.5rem' }} />
            Validation Errors
          </h4>
          <ul className="error-list">
            {validation.errors.map((error, index) => (
              <li key={index} className="error-item">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing and Extra PDF File Details */}
      {(validation.missingPdfs.length > 0 || validation.extraPdfs.length > 0) && (
        <div className="pdf-details">
          {/* Missing PDF Files Section */}
          {validation.missingPdfs.length > 0 && (
            <div className="pdf-section">
              <h5 className="pdf-section-title error-text">
                <FileX2 size={16} style={{ marginRight: '0.5rem' }} />
                Missing PDF Files ({validation.missingPdfs.length})
              </h5>
              <div className="pdf-list">
                {validation.missingPdfs.map((pdf, index) => (
                  <div key={index} className="pdf-item">{pdf}</div>
                ))}
              </div>
            </div>
          )}

          {/* Extra PDF Files Section */}
          {validation.extraPdfs.length > 0 && (
            <div className="pdf-section">
              <h5 className="pdf-section-title warning-text">
                <FileWarning size={16} style={{ marginRight: '0.5rem' }} />
                Extra PDF Files ({validation.extraPdfs.length})
              </h5>
              <div className="pdf-list">
                {validation.extraPdfs.map((pdf, index) => (
                  <div key={index} className="pdf-item">{pdf}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="validation-actions">
        {!validation.isValid && (
          <button
            onClick={onReupload}
            className="btn btn-secondary"
          >
            <FileUp size={16} />
            Upload Corrected ZIP
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchUpload; 