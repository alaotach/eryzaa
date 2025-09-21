import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useRole } from '../contexts/RoleContext';
import ClientDashboard from './ClientDashboard';
import ProviderDashboard from './ProviderDashboard';

const RoleDashboard: React.FC = () => {
  const { isConnected } = useWeb3();
  const { userRole, setUserRole } = useRole();

  if (!isConnected) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to access the Eryza compute marketplace dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Role Selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setUserRole('client')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                userRole === 'client'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🖥️ Client (Rent Compute)
            </button>
            <button
              onClick={() => setUserRole('provider')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                userRole === 'provider'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🖥️ Provider (Offer Compute)
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      {userRole === 'client' ? <ClientDashboard /> : <ProviderDashboard />}
    </div>
  );
};

export default RoleDashboard;
