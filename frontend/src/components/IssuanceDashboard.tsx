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

const IssuanceDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [project, setProject] = useState<Project | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const loadBatchData = useCallback(async (projectId: string, batchId: string) => {
    try {
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

  useEffect(() => {
    if (id) {
      const loadDashboardData = async (projectId: string) => {
        try {
          setLoading(true);
          setError(null);

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

  useEffect(() => {
    if (!id || !selectedBatch) return;

    websocketService.connect();
    websocketService.joinProject(id);
    websocketService.joinBatch(selectedBatch.id);

    const handlers = {
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
      onBatchCompleted: (data: { batchId: string }) => {
        if (data.batchId !== selectedBatch.id) return;
        console.log('Batch completed:', data);
        setIsProcessing(false);
        setSuccess('Batch processing completed successfully!');
        setSelectedBatch(prev => prev ? { ...prev, status: 'completed' } : null);
        loadBatchData(id, selectedBatch.id);
      },
      onBatchFailed: (data: { batchId: string }) => {
        if (data.batchId !== selectedBatch.id) return;
        console.log('Batch failed:', data);
        setIsProcessing(false);
        setError('Batch processing failed. Please check the logs.');
        setSelectedBatch(prev => prev ? { ...prev, status: 'failed' } : null);
        loadBatchData(id, selectedBatch.id);
      },
      onCertificateStarted: (data: { certificateId: string }) => {
        setCertificates(prev => 
          prev.map(cert => 
            cert.id === data.certificateId 
              ? { ...cert, status: 'in-progress' as const }
              : cert
          )
        );
      },
      onCertificateCompleted: (data: { certificateId: string; status: 'issued' | 'failed'; error?: string }) => {
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

        setBatchStatus(prevStatus => {
          if (!prevStatus) return null;
          
          const newStatusCounts = { ...prevStatus.statusCounts };
          
          newStatusCounts.pending = (newStatusCounts.pending || 1) - 1;
          newStatusCounts[data.status] = (newStatusCounts[data.status] || 0) + 1;
    
          return {
            ...prevStatus,
            statusCounts: newStatusCounts,
          };
        });
      },
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

    websocketService.onBatchEvents(handlers);

    return () => {
      websocketService.offBatchEvents();
    };
  }, [id, selectedBatch, loadBatchData]);

  const handleStartProcessing = async () => {
    if (!project || !selectedBatch) return;

    try {
      setError(null);
      
      const response = await projectApi.startBatchIssuance(project.id, selectedBatch.id);
      
      if (response.success) {
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

  const handleViewCertificate = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setViewModalOpen(true);
  };

  const handleDownloadAll = async () => {
    if (!project || !selectedBatch) return;

    try {
      setDownloadLoading(true);
      const blob = await projectApi.downloadAllCertificates(project.id, selectedBatch.id);
      
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

  const handleCertificateSelect = (certificateId: string, selected: boolean) => {
    if (selected) {
      setSelectedCertificateIds(prev => [...prev, certificateId]);
    } else {
      setSelectedCertificateIds(prev => prev.filter(id => id !== certificateId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const filteredCerts = certificates.filter(cert => cert.status === 'failed');
      setSelectedCertificateIds(filteredCerts.map(cert => cert.id));
    } else {
      setSelectedCertificateIds([]);
    }
  };

  const handleBatchChange = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch && project) {
      setSelectedBatch(batch);
      websocketService.joinBatch(batchId);
      await loadBatchData(project.id, batchId);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

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

  const getProgress = () => {
    if (!batchStatus || !certificates.length) return 0;
    
    const completed = certificates.filter(cert => 
      cert.status === 'issued' || cert.status === 'failed'
    ).length;
    
    return Math.round((completed / certificates.length) * 100);
  };
  
  // Return statement with JSX
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

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
      {project && <DashboardHeader project={project} />}

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

      {/* Batch Processing Controls */}
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

      {selectedBatch && certificates.length > 0 && (
        <>
          <BulkActions 
            selectedBatch={selectedBatch}
            selectedCertificateIds={selectedCertificateIds}
            bulkActionLoading={bulkActionLoading}
            downloadLoading={downloadLoading}
            handleBulkAction={handleBulkAction}
            handleDownloadAll={handleDownloadAll}
          />
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