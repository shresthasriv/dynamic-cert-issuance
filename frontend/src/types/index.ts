// Types for the Certificate Issuance Portal Frontend

export interface Project {
  id: string;
  name: string;
  description?: string;
  issuer: string;
  issueDate: string;
  templatePdfPath?: string;
  qrCoordinates?: {
    x: number;
    y: number;
  };
  createdAt: string;
  updatedAt: string;
}

// New types for Step 2 batch processing
export interface Batch {
  id: string;
  projectId: string;
  name: string;
  totalCertificates: number;
  processedCertificates: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  zipFilePath?: string;
  excelFilePath?: string;
  validationResults?: ValidationResults;
  createdAt: string;
  updatedAt: string;
}

// Types for Step 3 certificate issuance
export interface Certificate {
  id: string;
  projectId: string;
  batchId: string;
  certificateId: string;
  filename: string;
  status: 'pending' | 'in-progress' | 'issued' | 'failed';
  recipientName?: string;
  recipientEmail?: string;
  issuedPdfPath?: string;
  qrCodeData?: string;
  verificationUrl?: string;
  errorMessage?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResults {
  isValid: boolean;
  totalEntries: number;
  validRecords: number;
  invalidRecords: number;
  estimatedProcessingTime: number; // in minutes
  errors: string[];
  missingPdfs: string[];
  extraPdfs: string[];
  batchBreakdown: BatchBreakdown[];
}

export interface BatchBreakdown {
  batchNumber: number;
  certificateCount: number;
  estimatedTime: number; // in minutes
}

// Real-time status updates
export interface BatchStatus {
  batch: Batch;
  certificates: Certificate[];
  statusCounts: Record<string, number>;
  isProcessing: boolean;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 