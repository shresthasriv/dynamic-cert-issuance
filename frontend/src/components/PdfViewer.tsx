import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Project } from '../types';
import { projectApi } from '../services/api';
import {
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Save,
  Check,
  MousePointerClick,
  Crosshair,
  Lightbulb,
} from 'lucide-react';

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
  const [pdfError, setPdfError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const pdfUrl = project.templatePdfPath 
    ? `http://localhost:5000/${project.templatePdfPath}`
    : null;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('Error loading PDF:', error);
    const errorMsg = `Failed to load PDF: ${error?.message || 'Unknown error'}`;
    setPdfError(errorMsg);
    onError(errorMsg);
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
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
        <Crosshair />
        Set QR Code Position
      </h3>

      {/* Instructions */}
      <div className="pdf-instructions">
        <h4>
          <MousePointerClick size={18} style={{ marginRight: '0.5rem' }} />
          Click to Position QR Code
        </h4>
        <div>
          Click anywhere on the PDF below to set where the QR code should appear on certificates. 
          {coordinates && ` Current position: ${coordinates.x}%, ${coordinates.y}%`}
        </div>
      </div>

      {/* Error Display */}
      {pdfError && (
        <div className="pdf-error-box">
          <strong>Error:</strong> {pdfError}
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
              title="Previous Page"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="pdf-zoom-text">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
              disabled={pageNumber >= numPages}
              className="btn btn-secondary"
              title="Next Page"
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleZoomOut}
              className="btn btn-secondary"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="pdf-zoom-text" style={{ minWidth: '3rem', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="btn btn-secondary"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              className="btn btn-secondary"
              title="Reset Zoom"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {coordinates && (
            <span className="pdf-position-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Check size={16} />
              QR Position: {coordinates.x}%, {coordinates.y}%
            </span>
          )}
          <button
            onClick={handleSaveCoordinates}
            disabled={!coordinates || saving}
            className="btn btn-primary"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Save size={16} />
                Save Position
              </>
            )}
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
        <div className="pdf-coordinates-display">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="coordinates-title">
                QR Code Position Set
              </div>
              <div className="coordinates-value">
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
      <div className="pdf-tips">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lightbulb size={18} />
          Tips
        </h4>
        <ul>
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