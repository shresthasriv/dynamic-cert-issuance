import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="header">
        <h1>🏆 Certificate Issuance Portal</h1>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout; 