/**
 * PdfViewer.tsx
 * 
 * Interactive PDF viewer component that allows users to click on a PDF template
 * to set QR code coordinates. This is used in Step 1 of the certificate creation
 * process to define where QR codes should be placed on issued certificates.
 * 
 * Features:
 * - PDF rendering with react-pdf
 * - Click-to-position QR code functionality  
 * - Zoom controls for precise positioning
 * - Coordinate conversion from pixels to percentages
 * - Real-time coordinate display and validation
 * - Error handling for PDF loading issues
 */
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

/**
 * Props interface for PdfViewer component
 */
interface PdfViewerProps {
  /** Project containing the PDF template and existing coordinates */
  project: Project;
  /** Callback fired when coordinates are successfully saved */
  onCoordinatesSaved: (project: Project) => void;
  /** Callback fired when an error occurs */
  onError: (error: string) => void;
}

/**
 * PdfViewer Component
 * 
 * Renders an interactive PDF viewer that allows users to click anywhere on the PDF
 * to set QR code coordinates. Coordinates are converted from pixel positions to 
 * percentage-based positions for consistent placement across different PDF sizes.
 */
const PdfViewer: React.FC<PdfViewerProps> = ({ project, onCoordinatesSaved, onError }) => {
  // PDF document state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  
  // QR coordinate state - stores percentage-based coordinates (0-100)
  const [coordinates, setCoordinates] = useState<{ x: number; y: number } | null>(
    project.qrCoordinates || null
  );
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // Reference to the PDF canvas container for coordinate calculations
  const canvasRef = useRef<HTMLDivElement>(null);

  // Construct PDF URL from project template path
  const pdfUrl = project.templatePdfPath 
    ? `http://localhost:5000/${project.templatePdfPath}`
    : null;

  /**
   * Handles successful PDF document loading
   * Sets the total number of pages and clears any previous errors
   */
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  /**
   * Handles PDF document loading errors
   * Displays user-friendly error messages and logs detailed errors
   */
  const onDocumentLoadError = (error: any) => {
    console.error('Error loading PDF:', error);
    const errorMsg = `Failed to load PDF: ${error?.message || 'Unknown error'}`;
    setPdfError(errorMsg);
    onError(errorMsg);
  };

  /**
   * Handles click events on the PDF canvas to set QR code position
   * Converts screen coordinates to percentage-based coordinates for consistent placement
   * 
   * @param {React.MouseEvent<HTMLDivElement>} event - Click event on PDF canvas
   */
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    // Get click position relative to the PDF canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to relative coordinates (0-1) then to percentages (0-100)
    // This ensures coordinates work regardless of PDF zoom level or screen size
    const relativeX = x / rect.width;
    const relativeY = y / rect.height;

    // Store as percentage coordinates for consistent placement
    const newCoordinates = {
      x: Math.round(relativeX * 100),
      y: Math.round(relativeY * 100)
    };

    setCoordinates(newCoordinates);
  };

  /**
   * Saves the current QR code coordinates to the backend
   * Validates that coordinates are set before attempting to save
   */
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

  /**
   * Increases PDF zoom level (max 3.0x)
   */
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  /**
   * Decreases PDF zoom level (min 0.5x)
   */
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  /**
   * Resets zoom level to default (1.2x)
   */
  const handleResetZoom = () => {
    setScale(1.2);
  };

  // Early return if no PDF template is available
  if (!pdfUrl) {
    return (
      <div className="alert alert-error">
        No PDF template found. Please upload a template first.
      </div>
    );
  }

  return (
    <div>
      {/* Component Header */}
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
        <Crosshair />
        Set QR Code Position
      </h3>

      {/* Instructions for user interaction */}
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

      {/* PDF Controls - Navigation and Zoom */}
      <div className="pdf-controls">
        {/* Page Navigation Controls */}
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

          {/* Zoom Controls */}
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

        {/* Coordinate Display and Save Button */}
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

      {/* PDF Viewer Container */}
      <div className="pdf-viewer">
        <div className="pdf-canvas-container">
          {/* Clickable PDF Canvas - positioned relatively for coordinate calculation */}
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ position: 'relative', display: 'inline-block' }}
          >
            {/* React-PDF Document Component */}
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

            {/* QR Position Marker - shows selected coordinate as visual indicator */}
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

      {/* User Tips and Instructions */}
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