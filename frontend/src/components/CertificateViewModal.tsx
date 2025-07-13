import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Certificate } from '../types';
import {
  X,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  Download,
  Share,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface CertificateViewModalProps {
  certificate: Certificate;
  isOpen: boolean;
  onClose: () => void;
}

const CertificateViewModal: React.FC<CertificateViewModalProps> = ({
  certificate,
  isOpen,
  onClose
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = certificate.issuedPdfPath 
    ? `http://localhost:5000/${certificate.issuedPdfPath}`
    : null;

  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setLoading(true);
      setError(null);
    }
  }, [isOpen]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('Error loading certificate PDF:', error);
    setError('Failed to load certificate PDF.');
    setLoading(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${certificate.filename || certificate.certificateId}.pdf`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content certificate-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <h3>
              <FileText size={20} style={{ marginRight: '0.5rem' }} />
              Certificate: {certificate.certificateId}
            </h3>
            <p className="certificate-filename">{certificate.filename}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Controls */}
        <div className="modal-controls">
          <div className="pdf-controls">
            <button onClick={handleZoomOut} disabled={scale <= 0.5} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} disabled={scale >= 2.0} title="Zoom In">
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="page-controls">
            <button 
              onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
              disabled={pageNumber <= 1}
              title="Previous Page"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="page-info">
              Page {pageNumber} of {numPages}
            </span>
            <button 
              onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
              disabled={pageNumber >= numPages}
              title="Next Page"
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="action-controls">
            <button onClick={handleDownload} className="btn btn-primary">
              <Download size={16} />
              Download PDF
            </button>
            {certificate.verificationUrl && (
              <a 
                href={certificate.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <Share size={16} />
                Verify Certificate
              </a>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="pdf-viewer-container">
          {loading && (
            <div className="loading-state">
              <Loader2 size={32} className="animate-spin" />
              <p>Loading certificate...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <AlertTriangle size={32} />
              <p>{error}</p>
              <p>The certificate PDF may not be available or there was an error loading it.</p>
            </div>
          )}

          {pdfUrl && !error && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
            >
              <Page 
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          )}

          {!pdfUrl && !loading && (
            <div className="no-pdf-state">
              <FileText size={32} />
              <p>No PDF available for this certificate</p>
              <p>This certificate may still be processing or failed to generate.</p>
            </div>
          )}
        </div>

        {/* Certificate Details */}
        <div className="certificate-details">
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`status-badge ${certificate.status}`}>
              {certificate.status.replace('-', ' ')}
            </span>
          </div>
          
          {certificate.recipientName && (
            <div className="detail-row">
              <span className="detail-label">Recipient:</span>
              <span>{certificate.recipientName}</span>
            </div>
          )}
          
          {certificate.recipientEmail && (
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span>{certificate.recipientEmail}</span>
            </div>
          )}
          
          {certificate.processingCompletedAt && (
            <div className="detail-row">
              <span className="detail-label">Issued:</span>
              <span>{new Date(certificate.processingCompletedAt).toLocaleString()}</span>
            </div>
          )}
          
          {certificate.errorMessage && (
            <div className="detail-row error">
              <span className="detail-label">Error:</span>
              <span>{certificate.errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateViewModal; 