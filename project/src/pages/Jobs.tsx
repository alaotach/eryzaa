import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Clock, 
  Zap, 
  Shield, 
  Star,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { useJobs } from '../contexts/JobsContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import type { Job } from '../contexts/JobsContext';

const Jobs: React.FC = () => {
  const { jobs, takeJob } = useJobs();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    computeSize: '',
    priority: '',
    minReward: '',
    maxReward: '',
  });

  const filteredJobs = jobs.filter(job => {
    if (searchQuery && !job.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !job.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.computeSize && job.computeSize !== filters.computeSize) return false;
    if (filters.priority && job.priority !== filters.priority) return false;
    if (filters.minReward && job.reward < parseInt(filters.minReward)) return false;
    if (filters.maxReward && job.reward > parseInt(filters.maxReward)) return false;
    return true;
  });

  const getPriorityColor = (priority: Job['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-100 dark:bg-red-900';
      case 'normal': return 'text-blue-500 bg-blue-100 dark:bg-blue-900';
      case 'low': return 'text-gray-500 bg-gray-100 dark:bg-gray-900';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900';
    }
  };

  const getComputeSizeIcon = (size: Job['computeSize']) => {
    switch (size) {
      case 'small': return '🔹';
      case 'medium': return '🔸';
      case 'large': return '🔶';
      default: return '🔹';
    }
  };

  const handleTakeJob = (jobId: string) => {
    if (user) {
      takeJob(jobId, user.id);
      setSelectedJob(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Jobs Marketplace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredJobs.length} jobs available • Find compute work that matches your setup
          </p>
        </div>
        
        {user?.role === 'user' && (
          <Button>
            Submit New Job
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neon-blue focus:border-transparent"
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
                  Compute Size
                </label>
                <select
                  value={filters.computeSize}
                  onChange={(e) => setFilters({...filters, computeSize: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Sizes</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Reward
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minReward}
                  onChange={(e) => setFilters({...filters, minReward: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Reward
                </label>
                <input
                  type="number"
                  placeholder="1000"
                  value={filters.maxReward}
                  onChange={(e) => setFilters({...filters, maxReward: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              hover 
              onClick={() => setSelectedJob(job)}
              className="p-6 h-full cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getComputeSizeIcon(job.computeSize)}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(job.priority)}`}>
                    {job.priority}
                  </span>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-neon-blue">
                    {job.reward} ETZ
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {job.computeSize} compute
                  </p>
                </div>
              </div>

              {/* Job Info */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {job.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                  {job.description}
                </p>
              </div>

              {/* Requester */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-accent-blue rounded-full flex items-center justify-center">
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {job.requester}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Star size={12} className="text-yellow-500 fill-current" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {job.requesterReputation}/5
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Clock size={12} className="mr-1" />
                  {Math.floor((Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60))}h ago
                </div>
              </div>

              {/* Take Job Button */}
              {user?.role === 'provider' && job.status === 'submitted' && (
                <div className="mt-4">
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTakeJob(job.id);
                    }}
                    className="w-full"
                  >
                    Take Job
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <Zap size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No jobs found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters to find more jobs.
          </p>
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title="Job Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedJob.name}
                </h2>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedJob.priority)}`}>
                    {selectedJob.priority} priority
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedJob.computeSize} compute required
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-bold text-neon-blue mb-1">
                  {selectedJob.reward} ETZ
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedJob.tokensLocked} ETZ locked
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {selectedJob.description}
              </p>
            </div>

            {/* File Info */}
            {selectedJob.fileSize && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Files</h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Dataset size: {selectedJob.fileSize}
                    </span>
                    <Button variant="ghost" size="sm">
                      <ExternalLink size={16} className="mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Requester Info */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Requester</h3>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-neon-blue to-accent-blue rounded-full flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedJob.requester}
                  </p>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={16} 
                        className={`${
                          i < Math.floor(selectedJob.requesterReputation) 
                            ? 'text-yellow-500 fill-current' 
                            : 'text-gray-300 dark:text-gray-600'
                        }`} 
                      />
                    ))}
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      ({selectedJob.requesterReputation}/5)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {user?.role === 'provider' && selectedJob.status === 'submitted' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                <Button 
                  onClick={() => handleTakeJob(selectedJob.id)}
                  className="flex-1"
                >
                  Take Job - {selectedJob.reward} ETZ
                </Button>
                <Button variant="outline">
                  Report Job
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Jobs;