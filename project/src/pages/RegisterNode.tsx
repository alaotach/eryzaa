import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import walletIntegrationService from '../services/walletIntegrationService';
import { Server, Cpu, HardDrive, Zap, CheckCircle, AlertCircle, Clock, DollarSign, Wifi, Monitor } from 'lucide-react';

const RegisterNode: React.FC = () => {
  const navigate = useNavigate();
  const { userAddress, isConnected } = useWeb3();
  const { user } = useAuth();
  
  const [walletLinked, setWalletLinked] = useState(false);
  const [userBalance, setUserBalance] = useState('0');
  
  const [nodeData, setNodeData] = useState({
    nodeType: '',
    cpuCores: 4,
    memoryGB: 8,
    gpuCount: 0,
    gpuType: '',
    pricePerHour: '0.01',
    endpoint: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const nodeTypes = [
    { id: 'cpu-optimized', name: 'CPU Optimized', icon: Cpu, description: 'High-performance CPU for general compute' },
    { id: 'gpu-compute', name: 'GPU Compute', icon: Monitor, description: 'GPU-accelerated for ML/AI workloads' },
    { id: 'memory-optimized', name: 'Memory Optimized', icon: HardDrive, description: 'High memory for data processing' },
    { id: 'balanced', name: 'Balanced', icon: Server, description: 'Balanced CPU, memory and network' },
    { id: 'high-frequency', name: 'High Frequency', icon: Zap, description: 'High clock speed processors' }
  ];

  const gpuTypes = [
    'NVIDIA RTX 4090',
    'NVIDIA RTX 4080',
    'NVIDIA RTX 3090',
    'NVIDIA RTX 3080',
    'NVIDIA A100',
    'NVIDIA V100',
    'AMD RX 7900 XTX',
    'AMD RX 6900 XT',
    'Other'
  ];

  // Check wallet status on component mount
  useEffect(() => {
    checkWalletStatus();
  }, [user, isConnected]);

  const checkWalletStatus = async () => {
    try {
      const linkStatus = await walletIntegrationService.getWalletLinkStatus();
      setWalletLinked(linkStatus.isLinked);
      
      if (linkStatus.isLinked && linkStatus.walletAddress) {
        const userData = await walletIntegrationService.getUserData(linkStatus.walletAddress);
        if (userData) {
          setUserBalance(userData.tokenBalance);
        }
      }
    } catch (error) {
      console.error('Error checking wallet status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !userAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!walletLinked) {
      setError('Please link your wallet to your account first');
      return;
    }

    if (!nodeData.nodeType || !nodeData.endpoint) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      console.log('🚀 Registering compute node on Avalanche blockchain...');

      // Register node via wallet integration service
      const result = await walletIntegrationService.registerNodeOnBlockchain(nodeData);

      if (result.success && result.nodeId) {
        setSuccess(`Compute node registered successfully! Node ID: ${result.nodeId}`);
        
        // Reset form
        setNodeData({
          nodeType: '',
          cpuCores: 4,
          memoryGB: 8,
          gpuCount: 0,
          gpuType: '',
          pricePerHour: '0.01',
          endpoint: ''
        });

        // Navigate to node management after a short delay
        setTimeout(() => {
          navigate('/my-nodes');
        }, 2000);
      } else {
        setError(result.error || 'Failed to register node');
      }
    } catch (err: any) {
      console.error('Node registration error:', err);
      setError(err.message || 'Failed to register compute node');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setNodeData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setNodeData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateEstimatedEarnings = () => {
    const pricePerHour = parseFloat(nodeData.pricePerHour);
    const dailyEarnings = pricePerHour * 24;
    const monthlyEarnings = dailyEarnings * 30;
    return { daily: dailyEarnings.toFixed(3), monthly: monthlyEarnings.toFixed(2) };
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to register a compute node.</p>
        </div>
      </div>
    );
  }

  const earnings = calculateEstimatedEarnings();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Register Compute Node</h1>
          <p className="text-gray-600">Add your compute resources to the Avalanche network</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Balance</p>
          <p className="text-xl font-semibold text-blue-600">{userBalance} ERYZA</p>
        </div>
      </div>

      {/* Wallet Status Card */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {walletLinked ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className={`font-medium ${walletLinked ? 'text-green-600' : 'text-red-600'}`}>
                {walletLinked ? 'Wallet Connected' : 'Wallet Not Linked'}
              </p>
              <p className="text-sm text-gray-500">
                {walletLinked ? 'Ready to register nodes on Avalanche Fuji' : 'Please link wallet to account'}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            walletLinked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {walletLinked ? 'Connected' : 'Not Linked'}
          </div>
        </div>
      </div>

      {/* Earnings Preview */}
      {nodeData.pricePerHour && parseFloat(nodeData.pricePerHour) > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Estimated Earnings</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Daily: {earnings.daily} ERYZA</p>
              <p className="text-sm text-blue-600">Monthly: {earnings.monthly} ERYZA</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Node Configuration</h2>
          
          <div className="space-y-6">
            {/* Node Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Node Type *
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {nodeTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <label key={type.id} className="relative">
                      <input
                        type="radio"
                        name="nodeType"
                        value={type.id}
                        checked={nodeData.nodeType === type.id}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        nodeData.nodeType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-start space-x-3">
                          <IconComponent className="h-6 w-6 mt-1" />
                          <div>
                            <h3 className="font-medium">{type.name}</h3>
                            <p className="text-sm text-gray-500">{type.description}</p>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Hardware Specifications */}
            <div>
              <h3 className="text-lg font-medium mb-4">Hardware Specifications</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="cpuCores" className="block text-sm font-medium text-gray-700 mb-2">
                    CPU Cores *
                  </label>
                  <input
                    type="number"
                    id="cpuCores"
                    name="cpuCores"
                    value={nodeData.cpuCores}
                    onChange={handleChange}
                    min="1"
                    max="128"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="memoryGB" className="block text-sm font-medium text-gray-700 mb-2">
                    Memory (GB) *
                  </label>
                  <input
                    type="number"
                    id="memoryGB"
                    name="memoryGB"
                    value={nodeData.memoryGB}
                    onChange={handleChange}
                    min="1"
                    max="1024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="gpuCount" className="block text-sm font-medium text-gray-700 mb-2">
                    GPU Count
                  </label>
                  <input
                    type="number"
                    id="gpuCount"
                    name="gpuCount"
                    value={nodeData.gpuCount}
                    onChange={handleChange}
                    min="0"
                    max="8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="gpuType" className="block text-sm font-medium text-gray-700 mb-2">
                    GPU Type
                  </label>
                  <select
                    id="gpuType"
                    name="gpuType"
                    value={nodeData.gpuType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={nodeData.gpuCount === 0}
                  >
                    <option value="">Select GPU Type</option>
                    {gpuTypes.map((gpu) => (
                      <option key={gpu} value={gpu}>{gpu}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Network Configuration */}
            <div>
              <h3 className="text-lg font-medium mb-4">Network Configuration</h3>
              <div>
                <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Node Endpoint URL *
                  </div>
                </label>
                <input
                  type="url"
                  id="endpoint"
                  name="endpoint"
                  value={nodeData.endpoint}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-node.example.com:8080"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Public endpoint where your compute node can be reached
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-medium mb-4">Pricing</h3>
              <div>
                <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Hour (ERYZA) *
                </label>
                <input
                  type="number"
                  id="pricePerHour"
                  name="pricePerHour"
                  value={nodeData.pricePerHour}
                  onChange={handleChange}
                  step="0.001"
                  min="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Set competitive pricing based on your hardware capabilities
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-6 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mx-6 mb-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !nodeData.nodeType || !nodeData.endpoint || !walletLinked}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Registering on Blockchain...
                </>
              ) : (
                <>
                  <Server className="h-4 w-4" />
                  Register Node on Avalanche
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RegisterNode;
