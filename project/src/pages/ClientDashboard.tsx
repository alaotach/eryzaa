import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import jobsLedgerService from '../services/jobsLedgerService';
import blockchainService, { NodeInfo } from '../services/blockchainService';

const ClientDashboard: React.FC = () => {
  const { userAddress, isConnected } = useWeb3();
  const [clientAnalytics, setClientAnalytics] = React.useState<any>(null);
  const [myJobs, setMyJobs] = React.useState<any[]>([]);
  const [availableNodes, setAvailableNodes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchClientData = async () => {
      if (!isConnected || !userAddress) {
        setLoading(false);
        return;
      }

      try {
        // Get client analytics
        const analytics = await jobsLedgerService.getClientAnalytics(userAddress);
        setClientAnalytics(analytics);

        // Get my submitted jobs
        const myJobHistory = await jobsLedgerService.getClientJobHistory(userAddress);
        const myJobsData = await Promise.all(
          myJobHistory.slice(0, 10).map(async (jobId) => {
            return await jobsLedgerService.getJob(jobId);
          })
        );
        setMyJobs(myJobsData.filter(job => job !== null));

        // Get available nodes from blockchain
        const nodes = await blockchainService.getAvailableNodes();
        const formattedNodes = nodes.map((node: any) => ({
          id: node.id,
          provider: node.provider,
          type: node.nodeType,
          specs: `${node.cpuCores} CPU cores, ${node.memoryGB}GB RAM${node.gpuCount > 0 ? `, ${node.gpuCount}x ${node.gpuType}` : ''}`,
          pricePerHour: node.pricePerHour,
          status: node.available ? 'online' : 'offline',
          reliability: Math.round((node.successfulJobs / Math.max(node.totalJobs, 1)) * 100),
          location: 'Network Node'
        }));
        setAvailableNodes(formattedNodes);

      } catch (error) {
        console.error('Failed to fetch client data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [isConnected, userAddress]);

  const rentNode = (nodeId: number) => {
    // Redirect to job creation with pre-selected node
    window.location.href = `/create-job?nodeId=${nodeId}`;
  };

  if (!isConnected) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Client Dashboard</h1>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to access the client dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Client Dashboard</h1>
          <div className="space-x-3">
            <button
              onClick={() => window.location.href = '/create-job'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Job
            </button>
            <button
              onClick={() => window.location.href = '/jobs'}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View All Jobs
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Client Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {clientAnalytics?.totalJobsSubmitted || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {clientAnalytics?.successfulJobs || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {clientAnalytics ? parseFloat(clientAnalytics.totalSpent).toFixed(2) : '0.00'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Spent (ERYZA)</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {clientAnalytics?.reputationScore || 0}/100
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Reputation</div>
              </div>
            </div>

            {/* Available Nodes to Rent */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Available Compute Nodes ({availableNodes.filter(n => n.status === 'online').length} online)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {availableNodes.map((node) => (
                  <div key={node.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {node.type} Node #{node.id}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{node.specs}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Provider: {node.provider.slice(0, 8)}... • {node.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                          {node.pricePerHour} ERYZA/hr
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {node.reliability}% reliability
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        node.status === 'online' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : node.status === 'busy'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {node.status === 'online' ? '🟢 Available' : 
                         node.status === 'busy' ? '🟡 Busy' : '🔴 Offline'}
                      </span>
                      <div className="space-x-2">
                        <button
                          onClick={() => rentNode(node.id)}
                          disabled={node.status !== 'online'}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            node.status === 'online'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {node.status === 'online' ? 'Rent Now' : 'Unavailable'}
                        </button>
                        {node.status === 'busy' && (
                          <button className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">
                            Schedule Later
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Recent Jobs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                My Recent Jobs ({myJobs.length})
              </h2>
              {myJobs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't submitted any jobs yet.</p>
                  <button
                    onClick={() => window.location.href = '/create-job'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Your First Job
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myJobs.slice(0, 5).map((job) => (
                    <div key={job.jobId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Job #{job.jobId} - {job.jobType}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{job.jobDescription}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.currentPhase === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            job.currentPhase === 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            job.currentPhase === 2 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            job.currentPhase === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            job.currentPhase === 5 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {job.currentPhase === 0 ? 'Submitted' :
                             job.currentPhase === 1 ? 'Funded' :
                             job.currentPhase === 2 ? 'Assigned' :
                             job.currentPhase === 3 ? 'Running' :
                             job.currentPhase === 4 ? 'Validating' :
                             job.currentPhase === 5 ? 'Completed' :
                             'Failed'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Cost: {job.totalCost} ERYZA</span>
                          {job.provider !== '0x0000000000000000000000000000000000000000' && (
                            <span>Provider: {job.provider.slice(0, 8)}...</span>
                          )}
                        </div>
                        <button
                          onClick={() => window.location.href = `/jobs/${job.jobId}`}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                  {myJobs.length > 5 && (
                    <div className="text-center">
                      <button
                        onClick={() => window.location.href = '/jobs'}
                        className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        View All Jobs ({myJobs.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/create-job'}
                  className="p-4 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="text-blue-600 dark:text-blue-400 mb-2">📝</div>
                  <div className="font-medium text-gray-900 dark:text-white">Submit New Job</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Create a compute task</div>
                </button>
                <button
                  onClick={() => window.location.href = '/jobs'}
                  className="p-4 border-2 border-dashed border-green-300 dark:border-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <div className="text-green-600 dark:text-green-400 mb-2">📊</div>
                  <div className="font-medium text-gray-900 dark:text-white">View Job History</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Track your submissions</div>
                </button>
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="p-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <div className="text-purple-600 dark:text-purple-400 mb-2">👤</div>
                  <div className="font-medium text-gray-900 dark:text-white">View Profile</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Check your analytics</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
