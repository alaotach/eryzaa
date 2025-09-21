import React, { useState, useEffect } from 'react'
import axios from 'axios';
import RentNowModal from './RentNowModal';

interface ActiveJob {
  job_id: string;
  client_id: string;
  node_id: string;
  node_ip: string;
  ssh_username?: string;
  ssh_info?: string;
  status: string;
  created_at: string;
  expires_at?: string;
  payment_amount?: number;
}

interface RentalNode {
  node_id: string;
  ip_address: string;
  zerotier_ip?: string;
  status: string;
  current_job?: string;
  ssh_user?: string;
  capabilities: any;
  pricing: any;
  provider: string;
  last_seen: string;
}

interface JobStats {
  jobs: {
    total: number;
    active: number;
    completed: number;
  };
  nodes: {
    total: number;
    available: number;
    busy: number;
    utilization: number;
  };
}

const JobsDisplay: React.FC = () => {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [rentalNodes, setRentalNodes] = useState<RentalNode[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RentalNode | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobsResponse, nodesResponse, statsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/jobs-display/active-jobs`),
        axios.get(`${API_BASE_URL}/jobs-display/rental-nodes`),
        axios.get(`${API_BASE_URL}/jobs-display/job-stats`),
      ]);

      setActiveJobs(jobsResponse.data.data || []);
      setRentalNodes(nodesResponse.data.data || []);
      setJobStats(statsResponse.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      console.error('Error fetching job data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'accepted': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'available': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-orange-600 bg-orange-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleRentNode = (node: RentalNode) => {
    setSelectedNode(node);
    setIsRentModalOpen(true);
  };

  const handleCloseRentModal = () => {
    setIsRentModalOpen(false);
    setSelectedNode(null);
    // Refresh data to see if node status changed
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Eryzaa SSH Rental Dashboard</h1>
          <p className="text-gray-600">Real-time view of active jobs and rental node SSH access</p>
        </div>

        {/* Statistics Cards */}
        {jobStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📋 Total Jobs</h3>
              <p className="text-3xl font-bold text-blue-600">{jobStats.jobs.total}</p>
              <p className="text-sm text-gray-500">All time</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🔄 Active Jobs</h3>
              <p className="text-3xl font-bold text-green-600">{jobStats.jobs.active}</p>
              <p className="text-sm text-gray-500">Currently running</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🖥️ Rental Nodes</h3>
              <p className="text-3xl font-bold text-purple-600">{jobStats.nodes.total}</p>
              <p className="text-sm text-gray-500">{jobStats.nodes.available} available, {jobStats.nodes.busy} busy</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📊 Utilization</h3>
              <p className="text-3xl font-bold text-orange-600">{jobStats.nodes.utilization}%</p>
              <p className="text-sm text-gray-500">Node utilization</p>
            </div>
          </div>
        )}

        {/* Active Jobs Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">🔄 Active Jobs with SSH Access</h2>
              <p className="text-gray-600">Jobs currently running with SSH user access</p>
            </div>
            <div className="p-6">
              {activeJobs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📋</div>
                  <p className="text-gray-500">No active jobs with SSH access</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map((job) => (
                    <div key={job.job_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-800 mr-3">
                              Job: {job.job_id.slice(0, 8)}...
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                              {job.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">👤 Client ID: {job.client_id}</p>
                              <p className="text-sm text-gray-600">🖥️ Node: {job.node_id}</p>
                              <p className="text-sm text-gray-600">📍 IP Address: {job.node_ip}</p>
                              {job.payment_amount && (
                                <p className="text-sm text-gray-600">💰 Payment: ${job.payment_amount}</p>
                              )}
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">⏰ Created: {formatDateTime(job.created_at)}</p>
                              {job.expires_at && (
                                <p className="text-sm text-gray-600">⌛ Expires: {formatDateTime(job.expires_at)}</p>
                              )}
                            </div>
                          </div>

                          {/* SSH Access Information */}
                          {job.ssh_username && job.ssh_info && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <h4 className="font-semibold text-gray-800 mb-2">🔐 SSH Access (ONE USER ONLY)</h4>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-600 mb-1">Username: <code className="bg-gray-200 px-1 rounded">{job.ssh_username}</code></p>
                                  <p className="text-sm text-gray-600">Command: <code className="bg-gray-200 px-1 rounded">{job.ssh_info}</code></p>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(job.ssh_info || '')}
                                  className="ml-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                                >
                                  📋 Copy
                                </button>
                              </div>
                              <div className="mt-2 text-xs text-red-600">
                                ⚠️ Only ONE user can access this node at a time. SSH access will be revoked when job ends.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rental Nodes Section */}
        <div>
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">🖥️ Rental Nodes</h2>
              <p className="text-gray-600">Available rental nodes and their current status</p>
            </div>
            <div className="p-6">
              {rentalNodes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🖥️</div>
                  <p className="text-gray-500">No rental nodes available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rentalNodes.map((node) => (
                    <div key={node.node_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Node: {node.node_id.slice(0, 8)}...
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(node.status)}`}>
                          {node.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">📍 IP: {node.ip_address}</p>
                        {node.zerotier_ip && (
                          <p className="text-sm text-gray-600">🌐 ZeroTier: {node.zerotier_ip}</p>
                        )}
                        
                        {node.current_job ? (
                          <div className="p-2 bg-red-50 rounded">
                            <p className="text-sm text-red-600">🔴 BUSY - Running Job: {node.current_job.slice(0, 8)}...</p>
                            {node.ssh_user && (
                              <p className="text-xs text-red-600">🔐 SSH User: {node.ssh_user}</p>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 bg-green-50 rounded">
                            <p className="text-sm text-green-600">🟢 AVAILABLE - Ready for new jobs</p>
                            <button
                              onClick={() => handleRentNode(node)}
                              className="mt-2 w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              💳 Rent Now - {node.pricing?.per_hour || '0.5'} {node.pricing?.currency || 'AVAX'}/hr
                            </button>
                          </div>
                        )}
                        
                        {/* Node Specifications */}
                        {node.capabilities && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600 font-medium mb-1">🖥️ Specifications:</p>
                            <p className="text-xs text-gray-500">
                              CPU: {node.capabilities.cpu_cores} cores | 
                              RAM: {node.capabilities.memory_gb}GB | 
                              GPU: {node.capabilities.gpu_count > '0' ? 
                                `${node.capabilities.gpu_count}x ${node.capabilities.gpu_type}` : 'None'}
                            </p>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">Last seen: {formatDateTime(node.last_seen)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Refresh */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
          <button
            onClick={fetchData}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Rent Now Modal */}
      {selectedNode && (
        <RentNowModal
          isOpen={isRentModalOpen}
          onClose={handleCloseRentModal}
          node={selectedNode}
        />
      )}
    </div>
  );
};

export default JobsDisplay;
