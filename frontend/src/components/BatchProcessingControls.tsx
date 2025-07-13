import React from 'react';
import { Batch, BatchStatus } from '../types';
import { Download, CheckCircle, XCircle, Hourglass, Loader2, Rocket } from 'lucide-react';

interface BatchProcessingControlsProps {
  selectedBatch: Batch;
  batchStatus: BatchStatus | null;
  isProcessing: boolean;
  downloadLoading: boolean;
  getProgress: () => number;
  handleStartProcessing: () => void;
  handleDownloadAll: () => void;
}

const BatchProcessingControls: React.FC<BatchProcessingControlsProps> = ({
  selectedBatch,
  batchStatus,
  isProcessing,
  downloadLoading,
  getProgress,
  handleStartProcessing,
  handleDownloadAll,
}) => {
  return (
    <div className="processing-controls">
      <div className="control-header">
        <h3>Batch: {selectedBatch.name}</h3>
        <div className="batch-stats">
          <span>{selectedBatch.totalCertificates} total certificates</span>
          {batchStatus && (
            <>
              <span>•</span>
              <span><CheckCircle size={14} className="success-icon" /> {batchStatus.statusCounts.issued || 0} issued</span>
              <span>•</span>
              <span><XCircle size={14} className="error-icon" /> {batchStatus.statusCounts.failed || 0} failed</span>
              <span>•</span>
              <span><Hourglass size={14} className="pending-icon" /> {batchStatus.statusCounts.pending || 0} pending</span>
            </>
          )}
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <span>Processing Progress</span>
          <span>{getProgress()}% Complete</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      </div>

      <div className="action-buttons">
        {selectedBatch.status === 'pending' && !isProcessing && (
          <button 
            onClick={handleStartProcessing}
            className="btn btn-primary btn-lg"
          >
            <Rocket size={20} />
            Start Certificate Issuance
          </button>
        )}
        
        {isProcessing && (
          <div className="processing-indicator">
            <Loader2 size={24} className="animate-spin" />
            <span>Processing certificates in real-time...</span>
          </div>
        )}
        
        {selectedBatch.status === 'completed' && (
          <div className="completion-message">
            <span className="success-icon"><CheckCircle size={24} /></span>
            <span>Batch processing completed!</span>
            <button 
              onClick={handleDownloadAll}
              className="btn btn-primary"
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Preparing Download...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download All Certificates
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchProcessingControls; 