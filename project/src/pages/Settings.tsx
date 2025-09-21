import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useTheme } from '../contexts/ThemeContext';

const Settings: React.FC = () => {
  const { isConnected, userAddress, disconnectWallet } = useWeb3();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

        {/* Theme Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">Theme</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>

        {/* Wallet Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Wallet</h2>
          {isConnected ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Connected Address</label>
                <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1">
                  {userAddress}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">Wallet Connection</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Disconnect your wallet from the application</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No wallet connected</p>
          )}
        </div>

        {/* Network Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Network</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Current Network</span>
              <span className="text-gray-900 dark:text-white font-semibold">Avalanche Fuji Testnet</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Chain ID</span>
              <span className="text-gray-900 dark:text-white font-semibold">43113</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">RPC URL</span>
              <span className="text-gray-900 dark:text-white font-semibold text-sm">api.avax-test.network</span>
            </div>
          </div>
        </div>

        {/* Contract Addresses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Smart Contracts</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ERYZA Token</label>
              <p className="text-gray-900 dark:text-white font-mono text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1">
                {import.meta.env.VITE_ERYZA_TOKEN_ADDRESS || 'Not configured'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Marketplace</label>
              <p className="text-gray-900 dark:text-white font-mono text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1">
                {import.meta.env.VITE_MARKETPLACE_ADDRESS || 'Not configured'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Jobs Ledger</label>
              <p className="text-gray-900 dark:text-white font-mono text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1">
                {import.meta.env.VITE_JOBS_LEDGER_ADDRESS || 'Not configured'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Staking</label>
              <p className="text-gray-900 dark:text-white font-mono text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1">
                {import.meta.env.VITE_STAKING_ADDRESS || 'Not configured'}
              </p>
            </div>
          </div>
        </div>

        {/* Application Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Application Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Version</span>
              <span className="text-gray-900 dark:text-white font-semibold">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Environment</span>
              <span className="text-gray-900 dark:text-white font-semibold">Development</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Build Date</span>
              <span className="text-gray-900 dark:text-white font-semibold">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
