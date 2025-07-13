import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CreateProject from './components/CreateProject';
import ProjectList from './components/ProjectList';
import BatchUpload from './components/BatchUpload';
import IssuanceDashboard from './components/IssuanceDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/new" element={<CreateProject />} />
            <Route path="/projects/:id/step1" element={<CreateProject />} />
            <Route path="/projects/:id/step2" element={<BatchUpload />} />
            <Route path="/projects/:id/step3" element={<IssuanceDashboard />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
