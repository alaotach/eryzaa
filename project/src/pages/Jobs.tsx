import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Zap,
  ChevronDown
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import RentNowModal from '../components/RentNowModal';
import axios from 'axios';

interface RentalNode {
  node_id: string;
  ip_address: string;
  zerotier_ip?: string;
  status: string;
  current_job?: string;
  ssh_user?: string;
  capabilities: {
    cpu_cores: string;
    memory_gb: string;
    gpu_count: string;
    gpu_type: string;
  };
  pricing: {
    per_hour: string;
    currency: string;
  };
  provider: string;
  total_jobs: string;
  successful_jobs: string;
  last_seen: string;
}

const Jobs: React.FC = () => {
  const [rentalNodes, setRentalNodes] = useState<RentalNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RentalNode | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    minPrice: '',
    maxPrice: '',
    hasGPU: false,
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchRentalNodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/jobs-display/rental-nodes`);
      setRentalNodes(response.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rental nodes');
      console.error('Error fetching rental nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentalNodes();
  }, []);

  const filteredNodes = rentalNodes.filter(node => {
    if (searchQuery && !node.node_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !node.capabilities.gpu_type.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.status && node.status !== filters.status) return false;
    if (filters.minPrice && parseFloat(node.pricing.per_hour) < parseFloat(filters.minPrice)) return false;
    if (filters.maxPrice && parseFloat(node.pricing.per_hour) > parseFloat(filters.maxPrice)) return false;
    if (filters.hasGPU && parseInt(node.capabilities.gpu_count) === 0) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'busy': return 'text-orange-600 bg-orange-100 dark:bg-orange-900';
      case 'offline': return 'text-red-600 bg-red-100 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
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
    fetchRentalNodes();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading SSH rental nodes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Error Loading Nodes</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchRentalNodes}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🖥️ SSH Server Marketplace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredNodes.length} SSH servers available • Rent powerful servers with one-click access
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            🧪 <span className="ml-1">Avalanche Fuji Testnet - FREE to use!</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by node ID or GPU type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center"
        >
          <Filter size={20} className="mr-2" />
          Filters
          <ChevronDown size={16} className={`ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6"
        >
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Price (AVAX/hr)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Price (AVAX/hr)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GPU Required
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.hasGPU}
                    onChange={(e) => setFilters({...filters, hasGPU: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Has GPU</span>
                </label>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Rental Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNodes.map((node, index) => (
          <motion.div
            key={node.node_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              hover 
              className="p-6 h-full"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🖥️</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(node.status)}`}>
                    {node.status}
                  </span>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {node.pricing.per_hour} Testnet AVAX
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    per hour (FREE)
                  </p>
                </div>
              </div>

              {/* Node Info */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  SSH Node {node.node_id}
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>💻 CPU: {node.capabilities.cpu_cores} cores</p>
                  <p>🧠 RAM: {node.capabilities.memory_gb}GB</p>
                  <p>🎮 GPU: {parseInt(node.capabilities.gpu_count) > 0 ? 
                    `${node.capabilities.gpu_count}x ${node.capabilities.gpu_type}` : 'None'}</p>
                  <p>📍 IP: {node.ip_address}</p>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="space-y-3">
                {node.current_job ? (
                  <div className="p-3 bg-red-50 dark:bg-red-900 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">🔴 Currently Busy</p>
                    <p className="text-xs text-red-500 dark:text-red-400">Job: {node.current_job.slice(0, 8)}...</p>
                    {node.ssh_user && (
                      <p className="text-xs text-red-500 dark:text-red-400">SSH User: {node.ssh_user}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">🟢 Available Now</p>
                      <p className="text-xs text-green-500 dark:text-green-400">Ready for SSH access</p>
                    </div>
                    
                    <Button
                      onClick={() => handleRentNode(node)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      💳 Rent Now - {node.pricing.per_hour} Testnet AVAX/hr (FREE)
                    </Button>
                  </div>
                )}

                {/* Provider Info */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Jobs: {node.successful_jobs}/{node.total_jobs}</span>
                    <span>Last seen: {formatDateTime(node.last_seen)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredNodes.length === 0 && (
        <div className="text-center py-12">
          <Zap size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No SSH servers found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters to find available servers.
          </p>
        </div>
      )}

      {/* Rent Now Modal */}
      {selectedNode && (
        <RentNowModal
          isOpen={isRentModalOpen}
          onClose={handleCloseRentModal}
          node={selectedNode}
        />
      )}

      {/* Manual refresh info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
        <Button
          variant="outline"
          onClick={fetchRentalNodes}
          className="mt-2"
        >
          🔄 Refresh Now
        </Button>
      </div>
    </div>
  );
};

export default Jobs;