/**
 * IssuanceDashboard.tsx
 * 
 * Step 3 component - Main dashboard for certificate issuance management and monitoring.
 * Provides real-time tracking of certificate processing, batch status management,
 * and individual certificate actions. Integrates with WebSocket service for live updates.
 * 
 * Features:
 * - Real-time certificate processing status updates via WebSockets
 * - Batch selection and management
 * - Individual certificate actions (retry, reissue, view)
 * - Bulk operations for failed certificates
 * - Progress tracking and status visualization
 * - Certificate download and sharing functionality
 * - Detailed error handling and user feedback
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, Batch, Certificate, BatchStatus } from '../types';
import { projectApi } from '../services/api';
import { websocketService } from '../services/websocketService';
import CertificateViewModal from './CertificateViewModal';
import DashboardHeader from './DashboardHeader';
import BatchProcessingControls from './BatchProcessingControls';
import BulkActions from './BulkActions';
import CertificatesTable from './CertificatesTable';
import { ChevronDown } from 'lucide-react';

/**
 * IssuanceDashboard Component
 * 
 * Main dashboard component for Step 3 of the certificate issuance process.
 * Manages the entire certificate issuance lifecycle including batch processing,
 * real-time status updates, and certificate management actions.
 */
const IssuanceDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Core data state - manages project, batches, and certificates
  const [project, setProject] = useState<Project | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  
  // UI state management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modal and interaction state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([]);
  
  // Action loading states
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  /**
   * Loads batch-specific data including certificates and status
   * Memoized with useCallback to prevent unnecessary re-renders
   * 
   * @param {string} projectId - The project ID
   * @param {string} batchId - The batch ID to load data for
   */
  const loadBatchData = useCallback(async (projectId: string, batchId: string) => {
    try {
      // Load certificates and batch status in parallel for better performance
      const [certificatesResponse, statusResponse] = await Promise.all([
        projectApi.getBatchCertificates(projectId, batchId),
        projectApi.getBatchStatus(projectId, batchId)
      ]);

      if (certificatesResponse.success && certificatesResponse.data) {
        setCertificates(certificatesResponse.data);
      }

      if (statusResponse.success && statusResponse.data) {
        setBatchStatus(statusResponse.data);
        setIsProcessing(statusResponse.data.isProcessing);
      }
    } catch (error: any) {
      console.error('Error loading batch data:', error);
      setError(error.message || 'Failed to load batch data');
    }
  }, []);

  /**
   * Effect to load initial dashboard data when component mounts
   * Loads project details and available batches, sets up initial batch selection
   */
  useEffect(() => {
    if (id) {
      const loadDashboardData = async (projectId: string) => {
        try {
          setLoading(true);
          setError(null);

          // Load project and batches in parallel
          const [projectResponse, batchesResponse] = await Promise.all([
            projectApi.getProjectById(projectId),
            projectApi.getBatches(projectId)
          ]);

          if (projectResponse.success && projectResponse.data) {
            setProject(projectResponse.data);
          } else {
            setError('Project not found');
            return;
          }

          if (batchesResponse.success && batchesResponse.data) {
            setBatches(batchesResponse.data);
            
            // Auto-select the first valid batch (has passed validation and is ready for processing)
            const validBatch = batchesResponse.data.find(b => 
              b.validationResults?.isValid && (b.status === 'pending' || b.status === 'processing' || b.status === 'completed')
            );
            
            if (validBatch) {
              setSelectedBatch(validBatch);
              await loadBatchData(projectId, validBatch.id);
            }
          }
        } catch (error: any) {
          console.error('Error loading dashboard data:', error);
          setError(error.message || 'Failed to load dashboard data');
        } finally {
          setLoading(false);
        }
      };

      loadDashboardData(id);
    }
  }, [id, loadBatchData]);

  /**
   * Effect to set up WebSocket connections and event listeners for real-time updates
   * Manages batch processing events, certificate status changes, and cleanup
   */
  useEffect(() => {
    if (!id || !selectedBatch) return;

    // Connect to WebSocket and join relevant rooms
    websocketService.connect();
    websocketService.joinProject(id);
    websocketService.joinBatch(selectedBatch.id);

    // Define WebSocket event handlers for real-time updates
    const handlers = {
      /**
       * Handles batch processing start event
       * Updates UI to show processing state and initializes progress tracking
       */
      onBatchStarted: (data: { batchId: string; totalCertificates: number }) => {
        if (data.batchId !== selectedBatch.id) return;
        console.log('Batch started:', data);
        setIsProcessing(true);
        setSuccess(`Batch processing started! ${data.totalCertificates} certificates in queue.`);
        setSelectedBatch(prev => prev ? { ...prev, status: 'processing' } : null);
        
        // Initialize/reset batch status on start
        setBatchStatus(prev => {
          if (!prev) return null;
          return {
            ...prev,
            isProcessing: true,
            statusCounts: {
              pending: data.totalCertificates,
              issued: 0,
              failed: 0,
            }
          };
        });
      },

      /**
       * Handles batch completion event
       * Updates UI to show completed state and refreshes data
       */
      onBatchCompleted: (data: { batchId: string }) => {
        if (data.batchId !== selectedBatch.id) return;
        console.log('Batch completed:', data);
        setIsProcessing(false);
        setSuccess('Batch processing completed successfully!');
        setSelectedBatch(prev => prev ? { ...prev, status: 'completed' } : null);
        loadBatchData(id, selectedBatch.id);
      },

      /**
       * Handles batch failure event
       * Updates UI to show error state and refreshes data
       */
      onBatchFailed: (data: { batchId: string }) => {
        if (data.batchId !== selectedBatch.id) return;
        console.log('Batch failed:', data);
        setIsProcessing(false);
        setError('Batch processing failed. Please check the logs.');
        setSelectedBatch(prev => prev ? { ...prev, status: 'failed' } : null);
        loadBatchData(id, selectedBatch.id);
      },

      /**
       * Handles individual certificate processing start
       * Updates certificate status to show in-progress state
       */
      onCertificateStarted: (data: { certificateId: string }) => {
        setCertificates(prev => 
          prev.map(cert => 
            cert.id === data.certificateId 
              ? { ...cert, status: 'in-progress' as const }
              : cert
          )
        );
      },

      /**
       * Handles individual certificate completion (success or failure)
       * Updates certificate status and batch progress counters
       */
      onCertificateCompleted: (data: { certificateId: string; status: 'issued' | 'failed'; error?: string }) => {
        // Update individual certificate status
        setCertificates(prev => 
          prev.map(cert => 
            cert.id === data.certificateId 
              ? { 
                  ...cert, 
                  status: data.status,
                  errorMessage: data.error,
                  verificationUrl: data.status === 'issued' 
                    ? `https://verify.example.com?id=${cert.certificateId}` 
                    : undefined
                }
              : cert
          )
        );

        // Update batch status counters for progress tracking
        setBatchStatus(prevStatus => {
          if (!prevStatus) return null;
          
          const newStatusCounts = { ...prevStatus.statusCounts };
          
          // Decrement pending count and increment appropriate status count
          newStatusCounts.pending = (newStatusCounts.pending || 1) - 1;
          newStatusCounts[data.status] = (newStatusCounts[data.status] || 0) + 1;
    
          return {
            ...prevStatus,
            statusCounts: newStatusCounts,
          };
        });
      },

      /**
       * Handles certificate republish event
       * Updates certificate timestamp and shows success message
       */
      onCertificateRepublished: (data: { certificateId: string }) => {
        console.log('Certificate republished:', data);
        setSuccess('Certificate republished successfully!');
        setCertificates(prev => 
          prev.map(cert => 
            cert.id === data.certificateId 
              ? { ...cert, updatedAt: new Date().toISOString() }
              : cert
          )
        );
      }
    };

    // Register WebSocket event handlers
    websocketService.onBatchEvents(handlers);

    // Cleanup function to remove event listeners when component unmounts or dependencies change
    return () => {
      websocketService.offBatchEvents();
    };
  }, [id, selectedBatch, loadBatchData]);

  /**
   * Initiates batch processing by calling the API and setting up WebSocket monitoring
   */
  const handleStartProcessing = async () => {
    if (!project || !selectedBatch) return;

    try {
      setError(null);
      
      const response = await projectApi.startBatchIssuance(project.id, selectedBatch.id);
      
      if (response.success) {
        // Join batch WebSocket room for real-time updates
        websocketService.joinBatch(selectedBatch.id);
        setSuccess('Certificate issuance started! You will see real-time updates below.');
      } else {
        setError(response.error || 'Failed to start processing');
      }
    } catch (error: any) {
      console.error('Error starting processing:', error);
      setError(error.message || 'Failed to start processing');
    }
  };

  /**
   * Handles individual certificate actions (retry or reissue)
   * 
   * @param {'retry' | 'reissue'} action - The action to perform
   * @param {string} certificateId - ID of the certificate to act on
   */
  const handleCertificateAction = async (action: 'retry' | 'reissue', certificateId: string) => {
    if (!project) return;

    try {
      let response;
      if (action === 'retry') {
        response = await projectApi.retryCertificate(project.id, certificateId);
      } else {
        response = await projectApi.reissueCertificate(project.id, certificateId);
      }
      
      if (response.success) {
        setSuccess(`Certificate ${action} initiated`);
        // Reset certificate status to pending for processing
        setCertificates(prev => 
          prev.map(cert => 
            cert.id === certificateId 
              ? { ...cert, status: 'pending' as const, errorMessage: undefined }
              : cert
          )
        );
      } else {
        setError(response.error || `Failed to ${action} certificate`);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing certificate:`, error);
      setError(error.message || `Failed to ${action} certificate`);
    }
  };

  /**
   * Opens the certificate view modal for the selected certificate
   * 
   * @param {Certificate} certificate - Certificate to view
   */
  const handleViewCertificate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setViewModalOpen(true);
  };

  /**
   * Downloads all certificates in the current batch as a ZIP file
   */
  const handleDownloadAll = async () => {
    if (!project || !selectedBatch) return;

    try {
      setDownloadLoading(true);
      const blob = await projectApi.downloadAllCertificates(project.id, selectedBatch.id);
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedBatch.name}_certificates.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('All certificates downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading certificates:', error);
      setError(error.message || 'Failed to download certificates');
    } finally {
      setDownloadLoading(false);
    }
  };

  /**
   * Handles bulk actions on selected certificates (retry or reissue multiple)
   * 
   * @param {'retry' | 'reissue'} action - The bulk action to perform
   */
  const handleBulkAction = async (action: 'retry' | 'reissue') => {
    if (!project || selectedCertificateIds.length === 0) return;

    try {
      setBulkActionLoading(true);
      
      let response;
      if (action === 'retry') {
        response = await projectApi.bulkRetryCertificates(project.id, selectedCertificateIds);
      } else {
        response = await projectApi.bulkReissueCertificates(project.id, selectedCertificateIds);
      }
      
      if (response.success) {
        setSuccess(`Bulk ${action} initiated for ${selectedCertificateIds.length} certificates`);
        setSelectedCertificateIds([]);
        
        // Reset selected certificates to pending status
        setCertificates(prev => 
          prev.map(cert => 
            selectedCertificateIds.includes(cert.id)
              ? { ...cert, status: 'pending' as const, errorMessage: undefined }
              : cert
          )
        );
      } else {
        setError(response.error || `Failed to ${action} certificates`);
      }
    } catch (error: any) {
      console.error(`Error with bulk ${action}:`, error);
      setError(error.message || `Failed to ${action} certificates`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  /**
   * Handles individual certificate selection for bulk operations
   * 
   * @param {string} certificateId - ID of certificate to select/deselect
   * @param {boolean} selected - Whether certificate should be selected
   */
  const handleCertificateSelect = (certificateId: string, selected: boolean) => {
    if (selected) {
      setSelectedCertificateIds(prev => [...prev, certificateId]);
    } else {
      setSelectedCertificateIds(prev => prev.filter(id => id !== certificateId));
    }
  };

  /**
   * Handles select all/none functionality for bulk operations
   * Only selects failed certificates as they are the ones that can be retried
   * 
   * @param {boolean} selected - Whether to select all or deselect all
   */
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const filteredCerts = certificates.filter(cert => cert.status === 'failed');
      setSelectedCertificateIds(filteredCerts.map(cert => cert.id));
    } else {
      setSelectedCertificateIds([]);
    }
  };

  /**
   * Handles batch selection change
   * Switches to a different batch and loads its data
   * 
   * @param {string} batchId - ID of the batch to switch to
   */
  const handleBatchChange = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch && project) {
      setSelectedBatch(batch);
      websocketService.joinBatch(batchId);
      await loadBatchData(project.id, batchId);
    }
  };

  /**
   * Clears all error and success messages
   */
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  /**
   * Generates status badge component for certificate status display
   * 
   * @param {Certificate['status']} status - The certificate status
   * @returns {React.ReactNode} Styled status badge component
   */
  const getStatusBadge = (status: Certificate['status']): React.ReactNode => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium inline-block";
    let statusClasses = '';
    let statusText = '';

    switch (status) {
      case 'pending':
        statusClasses = 'bg-gray-100 text-gray-700';
        statusText = 'Pending';
        break;
      case 'in-progress':
        statusClasses = 'bg-blue-100 text-blue-700';
        statusText = 'In Progress';
        break;
      case 'issued':
        statusClasses = 'bg-green-100 text-green-700';
        statusText = 'Issued';
        break;
      case 'failed':
        statusClasses = 'bg-red-100 text-red-700';
        statusText = 'Failed';
        break;
      default:
        statusClasses = 'bg-gray-100 text-gray-700';
        statusText = 'Unknown';
        break;
    }
    return <span className={`${baseClasses} ${statusClasses}`}>{statusText}</span>;
  };

  /**
   * Calculates overall batch processing progress as a percentage
   * 
   * @returns {number} Progress percentage (0-100)
   */
  const getProgress = () => {
    if (!batchStatus || !certificates.length) return 0;
    
    const completed = certificates.filter(cert => 
      cert.status === 'issued' || cert.status === 'failed'
    ).length;
    
    return Math.round((completed / certificates.length) * 100);
  };
  
  // Loading state render
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Project not found state render
  if (!project) {
    return (
      <div className="error-state">
        <h2>Project Not Found</h2>
        <p>The requested project could not be found.</p>
        <Link to="/projects" className="btn btn-primary">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Dashboard Header with Project Information */}
      {project && <DashboardHeader project={project} />}

      {/* Error and Success Message Display */}
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

      {/* Batch Selection Dropdown */}
      {batches.length > 0 && (
      <div className="batch-selection">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Select a Batch to View</h2>
            <div className="select-wrapper">
              <select 
                id="batch-select"
                value={selectedBatch?.id || ''} 
                onChange={(e) => handleBatchChange(e.target.value)}
                className="batch-select"
              >
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} - {new Date(batch.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-chevron" />
            </div>
          </div>
        </div>
      )}

      {/* Batch Processing Controls - Start/Stop Processing and Progress */}
      {selectedBatch && selectedBatch.validationResults?.isValid && (
        <BatchProcessingControls 
          selectedBatch={selectedBatch}
          batchStatus={batchStatus}
          isProcessing={isProcessing}
          downloadLoading={downloadLoading}
          getProgress={getProgress}
          handleStartProcessing={handleStartProcessing}
          handleDownloadAll={handleDownloadAll}
        />
      )}

      {/* Main Certificate Management Interface */}
      {selectedBatch && certificates.length > 0 && (
        <>
          {/* Bulk Actions Component */}
          <BulkActions 
            selectedBatch={selectedBatch}
            selectedCertificateIds={selectedCertificateIds}
            bulkActionLoading={bulkActionLoading}
            downloadLoading={downloadLoading}
            handleBulkAction={handleBulkAction}
            handleDownloadAll={handleDownloadAll}
          />
          
          {/* Certificates Table Component */}
          <CertificatesTable
            certificates={certificates}
            selectedCertificateIds={selectedCertificateIds}
            getStatusBadge={getStatusBadge}
            handleSelectAll={handleSelectAll}
            handleCertificateSelect={handleCertificateSelect}
            handleViewCertificate={handleViewCertificate}
            handleCertificateAction={handleCertificateAction}
          />
        </>
      )}

      {/* Certificate View Modal */}
      {selectedCertificate && (
        <CertificateViewModal
          certificate={selectedCertificate}
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedCertificate(null);
          }}
        />
      )}

      {/* Empty State - No Certificates Found */}
      {selectedBatch && certificates.length === 0 && (
        <div className="empty-state">
          <h3>No Certificates Found</h3>
          <p>This batch doesn't have any certificates yet.</p>
        </div>
      )}
    </div>
  );
};

export default IssuanceDashboard; 