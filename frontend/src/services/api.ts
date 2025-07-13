import axios from 'axios';
import { Project, Batch, Certificate, BatchStatus, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 413) {
      throw new Error('File size too large. Please check the file size limits.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection and try again.');
    }
    
    throw error;
  }
);

export const projectApi = {
  // Get all projects
  getAllProjects: async (): Promise<ApiResponse<Project[]>> => {
    const response = await api.get('/projects');
    return response.data;
  },

  // Get project by ID
  getProjectById: async (id: string): Promise<ApiResponse<Project>> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Create new project
  createProject: async (projectData: {
    name: string;
    description?: string;
    issuer: string;
    issueDate: string;
  }): Promise<ApiResponse<Project>> => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  // Upload template PDF
  uploadTemplate: async (projectId: string, file: File): Promise<ApiResponse<Project>> => {
    const formData = new FormData();
    formData.append('template', file);

    const response = await api.post(`/projects/${projectId}/template`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 1 minute for PDF uploads
    });
    return response.data;
  },

  // Save QR coordinates
  saveCoordinates: async (
    projectId: string,
    coordinates: { x: number; y: number }
  ): Promise<ApiResponse<Project>> => {
    const response = await api.put(`/projects/${projectId}/coordinates`, coordinates);
    return response.data;
  },

  // Step 2: Upload batch ZIP file
  uploadBatch: async (
    projectId: string, 
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<ApiResponse<Batch>> => {
    const formData = new FormData();
    formData.append('batchZip', file);

    const response = await api.post(`/projects/${projectId}/batch`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for large ZIP files
      onUploadProgress,
    });
    return response.data;
  },

  // Get all batches for a project
  getBatches: async (projectId: string): Promise<ApiResponse<Batch[]>> => {
    const response = await api.get(`/projects/${projectId}/batches`);
    return response.data;
  },

  // Get specific batch details
  getBatch: async (projectId: string, batchId: string): Promise<ApiResponse<Batch>> => {
    const response = await api.get(`/projects/${projectId}/batches/${batchId}`);
    return response.data;
  },

  // Step 3: Certificate Issuance APIs
  
  // Start batch issuance
  startBatchIssuance: async (projectId: string, batchId: string): Promise<ApiResponse> => {
    const response = await api.post(`/projects/${projectId}/batches/${batchId}/start-issuance`);
    return response.data;
  },

  // Get all certificates for a project
  getCertificates: async (projectId: string): Promise<ApiResponse<Certificate[]>> => {
    const response = await api.get(`/projects/${projectId}/certificates`);
    return response.data;
  },

  // Get certificates for a specific batch
  getBatchCertificates: async (projectId: string, batchId: string): Promise<ApiResponse<Certificate[]>> => {
    const response = await api.get(`/projects/${projectId}/batches/${batchId}/certificates`);
    return response.data;
  },

  // Get batch processing status
  getBatchStatus: async (projectId: string, batchId: string): Promise<ApiResponse<BatchStatus>> => {
    const response = await api.get(`/projects/${projectId}/batches/${batchId}/status`);
    return response.data;
  },

  // Retry failed certificate
  retryCertificate: async (projectId: string, certificateId: string): Promise<ApiResponse> => {
    const response = await api.post(`/projects/${projectId}/certificates/${certificateId}/retry`);
    return response.data;
  },

  // Reissue certificate (new functionality)
  reissueCertificate: async (projectId: string, certificateId: string): Promise<ApiResponse> => {
    const response = await api.post(`/projects/${projectId}/certificates/${certificateId}/reissue`);
    return response.data;
  },

  // Republish certificate (new functionality)
  republishCertificate: async (projectId: string, certificateId: string): Promise<ApiResponse> => {
    const response = await api.post(`/projects/${projectId}/certificates/${certificateId}/republish`);
    return response.data;
  },

  // Download all certificates as ZIP (new functionality)
  downloadAllCertificates: async (projectId: string, batchId: string): Promise<Blob> => {
    const response = await api.get(`/projects/${projectId}/batches/${batchId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Bulk retry failed certificates
  bulkRetryCertificates: async (projectId: string, certificateIds: string[]): Promise<ApiResponse> => {
    const response = await api.post(`/projects/${projectId}/certificates/bulk-retry`, {
      certificateIds
    });
    return response.data;
  },

  // Bulk reissue certificates
  bulkReissueCertificates: async (projectId: string, certificateIds: string[]): Promise<ApiResponse> => {
    const response = await api.post(`/projects/${projectId}/certificates/bulk-reissue`, {
      certificateIds
    });
    return response.data;
  },

  // Delete project
  deleteProject: async (projectId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
}; 