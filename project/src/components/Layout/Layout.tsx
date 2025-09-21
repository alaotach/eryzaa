import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open on desktop

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-dark-bg">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;