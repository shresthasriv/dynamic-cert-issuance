import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Project, Batch, BatchBreakdown } from '../types';
import { projectApi } from '../services/api';
import StepIndicator from './StepIndicator';

const BatchUpload: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<any | null>(null); 
  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProjectAndBatches(id);
    }
  }, [id]);

  const loadProjectAndBatches = async (projectId: string) => {
    try {
      setLoading(true);
      
      // Load project and batches in parallel
      const [projectResponse, batchesResponse] = await Promise.all([
        projectApi.getProjectById(projectId),
        projectApi.getBatches(projectId)
      ]);

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data);
        
        // Check if project is ready for batch upload
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

  const validateFile = (file: File): string | null => {
    // Check file type - allow various ZIP mime types
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
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return 'File size must be less than 100MB. Please reduce your ZIP file size.';
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
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

      const response = await projectApi.uploadBatch(
        project.id, 
        file,
        (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      );

      if (response.success && response.data) {
        setCurrentBatch(response.data);
        setBatches(prev => [response.data!, ...prev.filter(b => b.id !== response.data!.id)]);
        
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

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const proceedToStep3 = () => {
    if (project && currentBatch?.validationResults?.isValid) {
      navigate(`/projects/${project.id}/step3`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 minute';
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Upload Certificate Batch</h2>
            <Link to={`/projects/${project.id}/step1`} className="btn btn-secondary">
              ← Back to Step 1
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

        {/* Project Summary */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
            📋 Project: {project.name}
          </h3>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
            <div>Issuer: {project.issuer}</div>
            <div>Issue Date: {new Date(project.issueDate).toLocaleDateString()}</div>
            <div>Template: ✅ Uploaded</div>
            <div>QR Position: ✅ Set</div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#eff6ff',
          borderRadius: '0.5rem',
          borderLeft: '4px solid #3b82f6'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>📦 ZIP File Requirements</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#374151' }}>
            <li>One Excel file (.xlsx or .xls) with certificate mapping</li>
            <li>Excel must contain columns: <strong>certificateId</strong> and <strong>filename</strong></li>
            <li>PDF files named exactly as specified in the Excel file</li>
            <li>Maximum 250 certificates per batch</li>
            <li>ZIP file size limit: 100MB</li>
          </ul>
        </div>

        {/* File Upload Area */}
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={uploading}
          />

          <div className="file-upload-icon">
            {uploading ? '⏳' : '📁'}
          </div>

          {uploading ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Uploading and processing ZIP file...</strong>
              </div>
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

        {/* Current Batch Status */}
        {currentBatch && (
          <BatchValidationResults 
            batch={currentBatch} 
            onReupload={handleClick}
            onProceedToStep3={proceedToStep3}
          />
        )}

        {/* Previous Batches */}
        {batches.length > 1 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Previous Batch Uploads</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {batches.slice(1).map((batch) => (
                <div 
                  key={batch.id} 
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong>{batch.name}</strong>
                    <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                      {batch.totalCertificates} certificates • {batch.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
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

// Separate component for validation results display
interface BatchValidationResultsProps {
  batch: Batch;
  onReupload: () => void;
  onProceedToStep3: () => void;
}

const BatchValidationResults: React.FC<BatchValidationResultsProps> = ({ 
  batch, 
  onReupload, 
  onProceedToStep3 
}) => {
  const validation = batch.validationResults;
  
  if (!validation) {
    return null;
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 minute';
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: validation.isValid ? '#f0fdf4' : '#fef2f2',
      borderRadius: '0.5rem',
      border: `2px solid ${validation.isValid ? '#16a34a' : '#dc2626'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
          {validation.isValid ? '✅' : '❌'}
        </div>
        <h3 style={{ margin: 0, color: validation.isValid ? '#16a34a' : '#dc2626' }}>
          {validation.isValid ? 'Validation Passed' : 'Validation Failed'}
        </h3>
      </div>

      {/* Validation Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ fontWeight: 600 }}>Total Entries</div>
          <div>{validation.totalEntries}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>Valid Records</div>
          <div style={{ color: '#16a34a' }}>{validation.validRecords}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>Invalid Records</div>
          <div style={{ color: '#dc2626' }}>{validation.invalidRecords}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>Estimated Time</div>
          <div>{formatTime(validation.estimatedProcessingTime)}</div>
        </div>
      </div>

      {/* Batch Breakdown */}
      {validation.batchBreakdown.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Automatic Batch Breakdown</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {validation.batchBreakdown.map((breakdown) => (
              <div 
                key={breakdown.batchNumber}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
              >
                Batch {breakdown.batchNumber}: {breakdown.certificateCount} certs 
                <span style={{ color: '#6b7280' }}> ({formatTime(breakdown.estimatedTime)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.5rem', color: '#dc2626' }}>Validation Errors</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {validation.errors.map((error, index) => (
              <li key={index} style={{ color: '#dc2626', marginBottom: '0.25rem' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing/Extra PDF Details */}
      {(validation.missingPdfs.length > 0 || validation.extraPdfs.length > 0) && (
        <div style={{ marginBottom: '1.5rem' }}>
          {validation.missingPdfs.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h5 style={{ color: '#dc2626' }}>Missing PDF Files ({validation.missingPdfs.length})</h5>
              <div style={{ 
                maxHeight: '100px', 
                overflowY: 'auto', 
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #fecaca'
              }}>
                {validation.missingPdfs.map((pdf, index) => (
                  <div key={index}>{pdf}</div>
                ))}
              </div>
            </div>
          )}

          {validation.extraPdfs.length > 0 && (
            <div>
              <h5 style={{ color: '#f59e0b' }}>Extra PDF Files ({validation.extraPdfs.length})</h5>
              <div style={{ 
                maxHeight: '100px', 
                overflowY: 'auto', 
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #fed7aa'
              }}>
                {validation.extraPdfs.map((pdf, index) => (
                  <div key={index}>{pdf}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        {!validation.isValid && (
          <button
            onClick={onReupload}
            className="btn btn-secondary"
          >
            📁 Upload Corrected ZIP
          </button>
        )}

        {validation.isValid && (
          <button
            onClick={onProceedToStep3}
            className="btn btn-primary"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          >
            Continue to Step 3: Issue Certificates →
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchUpload; 