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

export interface Certificate {
  id: string;
  projectId: string;
  certificateId: string;
  filename: string;
  status: 'pending' | 'in-progress' | 'issued' | 'failed';
  batchId: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface Batch {
  id: string;
  projectId: string;
  name: string;
  totalCertificates: number;
  processedCertificates: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  totalEntries: number;
  validRecords: number;
  invalidRecords: number;
  estimatedProcessingTime: number; // in minutes
  batches: BatchBreakdown[];
  errors: string[];
}

export interface BatchBreakdown {
  batchNumber: number;
  certificateCount: number;
  estimatedTime: number; // in minutes
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 