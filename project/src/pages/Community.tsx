import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import jobsLedgerService from '../services/jobsLedgerService';

const Community: React.FC = () => {
  const { isConnected } = useWeb3();
  const [platformAnalytics, setPlatformAnalytics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPlatformData = async () => {
      try {
        const analytics = await jobsLedgerService.getPlatformAnalytics();
        setPlatformAnalytics(analytics);
      } catch (error) {
        console.error('Failed to fetch platform analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatformData();
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Community</h1>

        {/* Platform Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Platform Overview</h2>
          {loading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : platformAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {platformAnalytics.totalJobs}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Total Jobs</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {platformAnalytics.completedJobs}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Completed Jobs</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {platformAnalytics.failedJobs}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Failed Jobs</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {parseFloat(platformAnalytics.totalRevenue).toFixed(2)}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Total Revenue (ERYZA)</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Unable to load platform analytics</p>
          )}
        </div>

        {/* Getting Started */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">For Clients</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Connect your wallet to get started
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Submit compute jobs through the marketplace
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Track job progress in real-time
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Pay with ERYZA tokens
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">For Providers</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Register your compute nodes
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Set competitive pricing
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Execute jobs and earn rewards
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Build reputation through quality service
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links and Resources */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Links & Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="https://docs.avax.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Avalanche Docs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Learn about Avalanche blockchain</p>
            </a>
            <a 
              href="https://testnet.snowtrace.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Snowtrace Explorer</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View transactions on testnet</p>
            </a>
            <a 
              href="https://faucet.avax.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Fuji Faucet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Get test AVAX tokens</p>
            </a>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Blockchain Connection</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Smart Contracts</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Deployed
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Jobs Ledger</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Wallet Connection</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
