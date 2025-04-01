import React from 'react';
import { Link } from 'wouter';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-neutral-800 cursor-pointer">
                FHIR Profile to SQL View Definition
              </h1>
            </Link>
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/FHIR/sql-on-fhir-v2" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-primary hover:text-primary-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
                <span>SQL on FHIR Spec</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-neutral-500">
            <div className="mb-2 md:mb-0">
              <p>&copy; {new Date().getFullYear()} FHIR SQL View Definition Generator. All rights reserved.</p>
            </div>
            <div className="flex space-x-4">
              <a 
                href="https://github.com/FHIR/sql-on-fhir-v2" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                SQL on FHIR Spec
              </a>
              <a 
                href="https://www.hl7.org/fhir/us/core/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                US Core IG
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
