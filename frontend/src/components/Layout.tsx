/**
 * Layout.tsx
 * 
 * Main layout component that provides the consistent shell structure
 * for all pages in the Certificate Issuance Portal. Contains the 
 * application header with branding and main content area.
 * 
 * Features:
 * - Consistent header with AI CERTs logo
 * - Main content wrapper for all page content
 * - Responsive layout structure
 * - Standardized spacing and styling
 */
import React from 'react';

/**
 * Props interface for Layout component
 */
interface LayoutProps {
  /** Child components to render in the main content area */
  children: React.ReactNode;
}

/**
 * Layout Component
 * 
 * Provides the main application shell with header and content areas.
 * Used as a wrapper for all pages to ensure consistent layout and branding.
 * The header displays the AI CERTs logo, and the main area renders child components.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      {/* Application Header with Logo */}
      <header className="header">
        <img 
          src="/AI-CERTs-R-logo.svg" 
          alt="AI CERTs" 
          className="logo"
          style={{ height: '40px' }}
        />
      </header>
      
      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout; 