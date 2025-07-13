// Types for the Certificate Issuance Portal Backend

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

export interface Certificate {
  id: string;
  certificateId: string;
  projectId: string;
  batchId: string;
  filename: string;
  recipientName?: string;
  recipientEmail?: string;
  status: 'pending' | 'in-progress' | 'issued' | 'failed';
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

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 