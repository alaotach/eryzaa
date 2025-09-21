import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/UI/Card';
import { useWeb3 } from '../contexts/Web3Context';

interface SystemMetrics {
  total_nodes: number;
  active_nodes: number;
  available_nodes: number;
  total_jobs: number;
  active_jobs: number;
  total_compute_power: number;
  blockchain_connected: boolean;
  last_updated: string;
  network_name: string;
}

interface NodeMetrics {
  node_id: number;
  node_type: string;
  cpu_cores: number;
  memory_gb: number;
  gpu_count: number;
  gpu_type: string;
  price_per_hour: string;
  is_active: boolean;
  current_jobs: number;
  provider: string;
}

const SystemMonitoringDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [nodeMetrics, setNodeMetrics] = useState<NodeMetrics[]>([]);
  const { availableNodes, userJobs, isConnected } = useWeb3();

  // Convert blockchain data to system metrics
  const updateMetricsFromBlockchain = useCallback(() => {
    if (isConnected) {
      const activeJobs = userJobs.filter(job => job.status === 1 || job.status === 2).length;
      
      const metrics: SystemMetrics = {
        total_nodes: availableNodes.length,
        active_nodes: availableNodes.length,
        available_nodes: availableNodes.length,
        total_jobs: userJobs.length,
        active_jobs: activeJobs,
        total_compute_power: availableNodes.reduce((sum, node) => sum + (node.cpuCores * 2.5), 0),
        blockchain_connected: isConnected,
        last_updated: new Date().toISOString(),
        network_name: 'Avalanche Fuji Testnet'
      };
      
      setSystemMetrics(metrics);
      
      // Convert nodes to metrics format
      const nodeData: NodeMetrics[] = availableNodes.map(node => ({
        node_id: node.id,
        node_type: node.nodeType,
        cpu_cores: node.cpuCores,
        memory_gb: node.memoryGB,
        gpu_count: node.gpuCount,
        gpu_type: node.gpuType,
        price_per_hour: node.pricePerHour,
        is_active: true,
        current_jobs: 0, // Would need to calculate from jobs assigned to this node
        provider: node.provider
      }));
      
      setNodeMetrics(nodeData);
    } else {
      // Show zeros when not connected
      const emptyMetrics: SystemMetrics = {
        total_nodes: 0,
        active_nodes: 0,
        available_nodes: 0,
        total_jobs: 0,
        active_jobs: 0,
        total_compute_power: 0,
        blockchain_connected: false,
        last_updated: new Date().toISOString(),
        network_name: 'Not Connected'
      };
      
      setSystemMetrics(emptyMetrics);
      setNodeMetrics([]);
    }
  }, [isConnected, availableNodes, userJobs]);  useEffect(() => {
    updateMetricsFromBlockchain();
    
    // Update every 30 seconds
    const interval = setInterval(updateMetricsFromBlockchain, 30000);
    
    return () => clearInterval(interval);
  }, [updateMetricsFromBlockchain]);

  const formatTFLOPS = (tflops: number) => {
    return `${tflops.toFixed(1)} TFLOPS`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Eryza Compute Network Monitor</h1>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              isConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {systemMetrics && (
              <div className={`flex items-center space-x-2 ${
                systemMetrics.blockchain_connected ? 'text-green-400' : 'text-red-400'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  systemMetrics.blockchain_connected ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm font-medium">{systemMetrics.network_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* System Overview */}
        {systemMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">Total Nodes</h3>
              <div className="text-3xl font-bold text-blue-400">{systemMetrics.total_nodes}</div>
              <div className="text-sm text-gray-400 mt-2">
                {systemMetrics.active_nodes} active • {systemMetrics.available_nodes} available
              </div>
            </Card>

            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">Compute Power</h3>
              <div className="text-3xl font-bold text-purple-400">
                {formatTFLOPS(systemMetrics.total_compute_power)}
              </div>
              <div className="text-sm text-gray-400 mt-2">Total system capacity</div>
            </Card>

            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">Active Jobs</h3>
              <div className="text-3xl font-bold text-green-400">
                {systemMetrics.active_jobs}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {systemMetrics.total_jobs} total jobs
              </div>
            </Card>

            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">Network Status</h3>
              <div className={`text-3xl font-bold ${systemMetrics.blockchain_connected ? 'text-green-400' : 'text-red-400'}`}>
                {systemMetrics.blockchain_connected ? 'ONLINE' : 'OFFLINE'}
              </div>
              <div className="text-sm text-gray-400 mt-2">{systemMetrics.network_name}</div>
            </Card>
          </div>
        )}

        {/* Node Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Compute Nodes</h2>
          {nodeMetrics.length === 0 ? (
            <Card className="bg-gray-800 p-8 text-center">
              <p className="text-gray-400 text-lg">No compute nodes registered</p>
              <p className="text-gray-500 text-sm mt-2">
                {isConnected ? 'Register a node to get started' : 'Connect wallet to view nodes'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nodeMetrics.map((node) => (
                <Card key={node.node_id} className="bg-gray-800 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">Node #{node.node_id}</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      node.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {node.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type</span>
                      <span className="text-white">{node.node_type}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">CPU Cores</span>
                      <span className="text-blue-400">{node.cpu_cores}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Memory</span>
                      <span className="text-purple-400">{node.memory_gb} GB</span>
                    </div>

                    {node.gpu_count > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">GPUs</span>
                          <span className="text-green-400">{node.gpu_count}x {node.gpu_type}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-400">Price/Hour</span>
                      <span className="text-yellow-400">${node.price_per_hour}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Jobs</span>
                      <span className="text-white">{node.current_jobs}</span>
                    </div>

                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Provider</span>
                        <span className="text-blue-400 text-sm font-mono">
                          {node.provider.slice(0, 6)}...{node.provider.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          {systemMetrics && (
            <p>Last updated: {new Date(systemMetrics.last_updated).toLocaleTimeString()}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoringDashboard;