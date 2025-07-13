import React from 'react';
import { Batch } from '../types';
import { Download, Loader2, RotateCw, Share2 } from 'lucide-react';

interface BulkActionsProps {
  selectedBatch: Batch;
  selectedCertificateIds: string[];
  bulkActionLoading: boolean;
  downloadLoading: boolean;
  handleBulkAction: (action: 'retry' | 'reissue') => void;
  handleDownloadAll: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedBatch,
  selectedCertificateIds,
  bulkActionLoading,
  downloadLoading,
  handleBulkAction,
  handleDownloadAll,
}) => {
  if (!selectedBatch) return null;

  return (
    <div className="bulk-actions">
      <h4>Bulk Actions</h4>
      <div className="bulk-actions-buttons">
        <button 
          onClick={() => handleBulkAction('retry')}
          className="btn btn-secondary"
          disabled={selectedCertificateIds.length === 0 || bulkActionLoading}
        >
          {bulkActionLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RotateCw size={16} />
          )}
          Retry Selected ({selectedCertificateIds.length})
        </button>
        
        <button 
          onClick={() => handleBulkAction('reissue')}
          className="btn btn-secondary"
          disabled={selectedCertificateIds.length === 0 || bulkActionLoading}
        >
          {bulkActionLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Share2 size={16} />
          )}
          Reissue Selected ({selectedCertificateIds.length})
        </button>

        {selectedBatch.status === 'completed' && (
          <button 
            onClick={handleDownloadAll}
            className="btn btn-primary"
            disabled={downloadLoading}
          >
            {downloadLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Download All as ZIP
          </button>
        )}
      </div>
    </div>
  );
};

export default BulkActions; 