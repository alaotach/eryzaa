import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import jobsLedgerService from '../services/jobsLedgerService';

const Profile: React.FC = () => {
  const { userAddress, isConnected } = useWeb3();
  const [clientAnalytics, setClientAnalytics] = React.useState<any>(null);
  const [nodePerformance, setNodePerformance] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isConnected || !userAddress) {
        setLoading(false);
        return;
      }

      try {
        const [clientData, nodeData] = await Promise.all([
          jobsLedgerService.getClientAnalytics(userAddress),
          jobsLedgerService.getNodePerformance(userAddress)
        ]);

        setClientAnalytics(clientData);
        setNodePerformance(nodeData);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isConnected, userAddress]);

  if (!isConnected) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Profile</h1>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to view your profile and analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Profile</h1>

        {/* Wallet Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Wallet Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
              <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {userAddress}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Network</label>
              <p className="text-gray-900 dark:text-white">Avalanche Fuji Testnet</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Connected
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Client Analytics</h2>
              {clientAnalytics ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Jobs</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{clientAnalytics.totalJobsSubmitted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Successful Jobs</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{clientAnalytics.successfulJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Spent</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{parseFloat(clientAnalytics.totalSpent).toFixed(4)} ERYZA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Avg Duration</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{clientAnalytics.averageJobDuration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Reputation Score</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{clientAnalytics.reputationScore}/100</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No client data available</p>
              )}
            </div>

            {/* Node Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Provider Performance</h2>
              {nodePerformance ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Jobs</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{nodePerformance.totalJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Successful Jobs</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{nodePerformance.successfulJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Failed Jobs</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{nodePerformance.failedJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Revenue</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{parseFloat(nodePerformance.totalRevenue).toFixed(4)} ERYZA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Avg Quality Score</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{nodePerformance.averageQualityScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Reliability Score</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{nodePerformance.reliabilityScore}/100</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No provider data available</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/create-job'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit New Job
            </button>
            <button
              onClick={() => window.location.href = '/jobs'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View All Jobs
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
