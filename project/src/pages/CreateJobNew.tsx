import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { Priority } from '../services/jobsLedgerService';
import walletIntegrationService from '../services/walletIntegrationService';
import { Upload, Calculator, Cpu, Brain, Image, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

const CreateJob: React.FC = () => {
  const navigate = useNavigate();
  const { userAddress, isConnected } = useWeb3();
  const { user } = useAuth();
  const { userRole } = useRole();
  
  const [walletLinked, setWalletLinked] = useState(false);
  const [userBalance, setUserBalance] = useState('0');
  
  const [formData, setFormData] = useState({
    jobType: '',
    description: '',
    inputDataHash: '',
    configHash: '',
    estimatedDuration: 3600, // 1 hour default
    totalCost: '0.1',
    priority: Priority.Normal,
    isPrivate: false,
    metadata: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const jobTypes = [
    { id: 'ml-training', name: 'Machine Learning Training', icon: Brain },
    { id: 'data-processing', name: 'Data Processing', icon: Calculator },
    { id: 'image-processing', name: 'Image Processing', icon: Image },
    { id: 'compute-intensive', name: 'Compute Intensive', icon: Cpu },
    { id: 'custom', name: 'Custom Job', icon: Upload }
  ];

  const priorities = [
    { value: Priority.Low, name: 'Low', color: 'text-gray-600' },
    { value: Priority.Normal, name: 'Normal', color: 'text-blue-600' },
    { value: Priority.High, name: 'High', color: 'text-orange-600' },
    { value: Priority.Urgent, name: 'Urgent', color: 'text-red-600' }
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

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      console.log('🚀 Submitting job via Wallet Integration Service...');

      // Use wallet integration service to save to blockchain
      const result = await walletIntegrationService.saveJobToBlockchain({
        jobType: formData.jobType,
        description: formData.description,
        inputDataHash: formData.inputDataHash || '0x' + '0'.repeat(64), // Placeholder if empty
        configHash: formData.configHash || '0x' + '0'.repeat(64), // Placeholder if empty
        estimatedDuration: formData.estimatedDuration,
        totalCost: formData.totalCost,
        priority: formData.priority,
        isPrivate: formData.isPrivate,
        metadata: formData.metadata || JSON.stringify({
          createdAt: new Date().toISOString(),
          submittedVia: 'Eryzaa Frontend'
        })
      });

      if (result.success && result.jobId) {
        setSuccess(`Job submitted successfully! Job ID: ${result.jobId}`);
        // Navigate to the job details page after a short delay
        setTimeout(() => {
          navigate(`/my-jobs`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit job');
      }
    } catch (err: any) {
      console.error('Job submission error:', err);
      setError(err.message || 'Failed to submit job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checkbox.checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to create a job.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Create New Job</h1>
          <p className="text-gray-600">Submit a compute job to the Avalanche network</p>
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
                {walletLinked ? 'Ready to submit jobs on Avalanche Fuji' : 'Please link wallet to account'}
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

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Type
              </label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {jobTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <label key={type.id} className="relative">
                      <input
                        type="radio"
                        name="jobType"
                        value={type.id}
                        checked={formData.jobType === type.id}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.jobType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex flex-col items-center text-center">
                          <IconComponent className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">{type.name}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your compute job requirements..."
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (seconds)
                </label>
                <input
                  type="number"
                  id="estimatedDuration"
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleChange}
                  min="60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="totalCost" className="block text-sm font-medium text-gray-700 mb-2">
                  Budget (ERYZA)
                </label>
                <input
                  type="number"
                  id="totalCost"
                  name="totalCost"
                  value={formData.totalCost}
                  onChange={handleChange}
                  step="0.001"
                  min="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="inputDataHash" className="block text-sm font-medium text-gray-700 mb-2">
                Input Data Hash (Optional)
              </label>
              <input
                type="text"
                id="inputDataHash"
                name="inputDataHash"
                value={formData.inputDataHash}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0x..."
              />
            </div>

            <div>
              <label htmlFor="configHash" className="block text-sm font-medium text-gray-700 mb-2">
                Config Hash (Optional)
              </label>
              <input
                type="text"
                id="configHash"
                name="configHash"
                value={formData.configHash}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0x..."
              />
            </div>

            <div>
              <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-2">
                Metadata (Optional)
              </label>
              <textarea
                id="metadata"
                name="metadata"
                value={formData.metadata}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional metadata in JSON format..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Private Job (restricted access)
              </label>
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
              disabled={submitting || !formData.jobType || !formData.description || !walletLinked}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Submitting to Blockchain...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Create Job on Avalanche
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
