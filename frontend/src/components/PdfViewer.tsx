import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Project } from '../types';
import { projectApi } from '../services/api';

// Set up PDF.js worker - using react-pdf's pdfjs instance
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface PdfViewerProps {
  project: Project;
  onCoordinatesSaved: (project: Project) => void;
  onError: (error: string) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ project, onCoordinatesSaved, onError }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [coordinates, setCoordinates] = useState<{ x: number; y: number } | null>(
    project.qrCoordinates || null
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const pdfUrl = project.templatePdfPath 
    ? `http://localhost:5000/${project.templatePdfPath}`
    : null;

  // Debug logging
  useEffect(() => {
    console.log('PdfViewer - project:', project);
    console.log('PdfViewer - pdfUrl:', pdfUrl);
    console.log('PdfViewer - worker src:', pdfjs.GlobalWorkerOptions.workerSrc);
    console.log('PdfViewer - pdfjs version:', pdfjs.version);
  }, [project, pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('Error loading PDF:', error);
    const errorMsg = `Failed to load PDF: ${error?.message || 'Unknown error'}`;
    setPdfError(errorMsg);
    onError(errorMsg);
    setLoading(false);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to relative coordinates (0-1)
    const relativeX = x / rect.width;
    const relativeY = y / rect.height;

    // Store as percentage coordinates
    const newCoordinates = {
      x: Math.round(relativeX * 100),
      y: Math.round(relativeY * 100)
    };

    setCoordinates(newCoordinates);
  };

  const handleSaveCoordinates = async () => {
    if (!coordinates) {
      onError('Please click on the PDF to set QR code position');
      return;
    }

    try {
      setSaving(true);
      const response = await projectApi.saveCoordinates(project.id, coordinates);
      
      if (response.success && response.data) {
        onCoordinatesSaved(response.data);
      } else {
        onError(response.error || 'Failed to save coordinates');
      }
    } catch (error) {
      console.error('Error saving coordinates:', error);
      onError('Failed to save coordinates. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.2);
  };

  if (!pdfUrl) {
    return (
      <div className="alert alert-error">
        No PDF template found. Please upload a template first.
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
        🎯 Set QR Code Position
      </h3>

      {/* Instructions */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#fffbeb',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
        border: '1px solid #fed7aa'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>
          📍 Click to Position QR Code
        </h4>
        <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
          Click anywhere on the PDF below to set where the QR code should appear on certificates. 
          {coordinates && ` Current position: ${coordinates.x}%, ${coordinates.y}%`}
        </div>
      </div>

      {/* Debug Information */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#f3f4f6',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.875rem'
      }}>
        <div><strong>Debug Info:</strong></div>
        <div>PDF URL: {pdfUrl}</div>
        <div>Worker: {pdfjs.GlobalWorkerOptions.workerSrc}</div>
        <div>PDF.js Version: {pdfjs.version}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {pdfError || 'None'}</div>
        <div>Pages: {numPages}</div>
      </div>

      {/* Error Display */}
      {pdfError && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          border: '1px solid #fecaca'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#dc2626' }}>
            ❌ PDF Loading Error
          </h4>
          <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
            {pdfError}
          </div>
        </div>
      )}

      {/* PDF Controls */}
      <div className="pdf-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
              disabled={pageNumber <= 1}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              ←
            </button>
            <span style={{ fontSize: '0.875rem' }}>
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
              disabled={pageNumber >= numPages}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              →
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleZoomOut}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              -
            </button>
            <span style={{ fontSize: '0.875rem', minWidth: '3rem', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              +
            </button>
            <button
              onClick={handleResetZoom}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {coordinates && (
            <span style={{ fontSize: '0.875rem', color: '#059669' }}>
              ✓ QR Position: {coordinates.x}%, {coordinates.y}%
            </span>
          )}
          <button
            onClick={handleSaveCoordinates}
            disabled={!coordinates || saving}
            className="btn btn-primary"
            style={{ fontSize: '0.75rem' }}
          >
            {saving ? 'Saving...' : 'Save Position'}
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="pdf-viewer">
        <div className="pdf-canvas-container">
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ position: 'relative', display: 'inline-block' }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="loading">
                  <div className="spinner" />
                  <div>Loading PDF...</div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="pdf-canvas"
                loading={
                  <div className="loading">
                    <div className="spinner" />
                  </div>
                }
              />
            </Document>

            {/* QR Position Marker */}
            {coordinates && canvasRef.current && (
              <div
                className="qr-marker"
                style={{
                  left: `${coordinates.x}%`,
                  top: `${coordinates.y}%`,
                }}
                title={`QR Code Position: ${coordinates.x}%, ${coordinates.y}%`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Current Coordinates Display */}
      {coordinates && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#dcfce7',
          borderRadius: '0.5rem',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#166534' }}>
                QR Code Position Set
              </div>
              <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                X: {coordinates.x}%, Y: {coordinates.y}%
              </div>
            </div>
            <button
              onClick={() => setCoordinates(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
            >
              Clear Position
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#eff6ff',
        borderRadius: '0.5rem',
        borderLeft: '4px solid #3b82f6'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>💡 Tips</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#374151' }}>
          <li>Click on an empty area of the certificate where you want the QR code to appear</li>
          <li>Use zoom controls to position the QR code more precisely</li>
          <li>The red circle shows where the QR code will be placed</li>
          <li>You can click multiple times to adjust the position before saving</li>
        </ul>
      </div>
    </div>
  );
};

export default PdfViewer; 