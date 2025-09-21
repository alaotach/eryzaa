import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Menu, 
  User,
  Wallet,
  LogOut,
  Users,
  Monitor
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRole } from '../../contexts/RoleContext';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { userRole, toggleRole } = useRole();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className=" p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-300" />
          </button>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs, providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neon-blue focus:border-transparent"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isDark ? (
              <Sun size={20} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon size={20} className="text-gray-600 dark:text-gray-300" />
            )}
          </button>

          {/* Role toggle */}
          {user && (
            <button
              onClick={toggleRole}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
              title={`Switch to ${userRole === 'client' ? 'Provider' : 'Client'} view`}
            >
              {userRole === 'client' ? (
                <Users size={20} className="text-blue-600 dark:text-blue-400" />
              ) : (
                <Monitor size={20} className="text-green-600 dark:text-green-400" />
              )}
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 hidden lg:block">
                {userRole === 'client' ? 'Client' : 'Provider'}
              </span>
            </button>
          )}

          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative">
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Wallet status */}
          {user?.walletAddress && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-neon-blue bg-opacity-10 rounded-lg">
              <Wallet size={16} className="text-neon-blue" />
              <span className="text-sm font-medium text-neon-blue">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
            </div>
          )}

          {/* User menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <img 
                  src={user.avatar} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full"
                />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-lg shadow-lg border border-gray-200 dark:border-dark-border z-50"
                  >
                    <div className="p-3 border-b border-gray-200 dark:border-dark-border">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.tokenBalance} ETZ tokens
                      </p>
                    </div>
                    
                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User size={16} />
                        <span className="text-sm">Profile</span>
                      </Link>
                      
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
                      >
                        <LogOut size={16} />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;