import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Briefcase, 
  User, 
  Users, 
  FileText, 
  Settings,
  Wallet,
  BarChart3,
  PlusCircle,
  Server
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Briefcase, label: 'Jobs Marketplace', path: '/jobs' },
    { icon: PlusCircle, label: 'Submit Job', path: '/submit-job', userOnly: true },
    { icon: BarChart3, label: 'My Jobs', path: '/my-jobs' },
    { icon: Server, label: 'Server Monitor', path: '/server' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Wallet, label: 'Ledger', path: '/ledger' },
    { icon: Users, label: 'Community', path: '/community' },
    { icon: FileText, label: 'Smart Contracts', path: '/conditions' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.userOnly || user?.role === 'user'
  );

  const sidebarVariants = {
    open: { 
      x: 0
    },
    closed: { 
      x: '-100%'
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <motion.div 
        className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border z-50 lg:z-30`}
        variants={sidebarVariants}
        animate={isOpen ? 'open' : 'closed'}
        initial={false}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-neon-blue rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Eryza</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-neon-blue text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          {user && (
            <div className="p-4 border-t border-gray-200 dark:border-dark-border">
              <div className="flex items-center space-x-3">
                <img 
                  src={user.avatar} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;