import axios from 'axios';
import { Project, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
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
};

export default api; 