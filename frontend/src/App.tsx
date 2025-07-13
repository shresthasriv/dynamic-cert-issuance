/**
 * App.tsx
 * 
 * Main application component for the Certificate Issuance Portal.
 * Defines the complete routing structure for the 3-step certificate 
 * issuance process and provides the application shell.
 * 
 * Application Flow:
 * 1. Project List (/projects) - View all certificate projects
 * 2. Create/Edit Project (/projects/new or /projects/:id/step1) - Step 1: Project setup and template upload
 * 3. Batch Upload (/projects/:id/step2) - Step 2: Upload ZIP with certificates and mapping
 * 4. Issuance Dashboard (/projects/:id/step3) - Step 3: Monitor and manage certificate issuance
 * 
 * Features:
 * - React Router for SPA navigation
 * - Protected routing with URL parameters
 * - Centralized layout component
 * - Redirect handling for invalid routes
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CreateProject from './components/CreateProject';
import ProjectList from './components/ProjectList';
import BatchUpload from './components/BatchUpload';
import IssuanceDashboard from './components/IssuanceDashboard';
import './App.css';

/**
 * App Component
 * 
 * Root application component that sets up routing and layout structure.
 * Provides navigation between all major application features and maintains
 * the overall application shell with header and main content areas.
 */
function App() {
  return (
    <Router>
      <div className="App">
        <Layout>
          <Routes>
            {/* Root redirect to project list */}
            <Route path="/" element={<Navigate to="/projects" replace />} />
            
            {/* Project management routes */}
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/new" element={<CreateProject />} />
            
            {/* Step-based certificate issuance workflow */}
            <Route path="/projects/:id/step1" element={<CreateProject />} />
            <Route path="/projects/:id/step2" element={<BatchUpload />} />
            <Route path="/projects/:id/step3" element={<IssuanceDashboard />} />
            
            {/* Catch-all route for invalid URLs */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
