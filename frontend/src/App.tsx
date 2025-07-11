import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CreateProject from './components/CreateProject';
import ProjectList from './components/ProjectList';
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
            {/* Step 2 and 3 routes will be added later */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
