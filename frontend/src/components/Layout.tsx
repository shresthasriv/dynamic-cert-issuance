import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="header">
        <img 
          src="/AI-CERTs-R-logo.svg" 
          alt="AI CERTs" 
          className="logo"
          style={{ height: '40px' }}
        />
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout; 