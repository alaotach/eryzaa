import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Clock, 
  Zap, 
  Plus,
  Briefcase
} from 'lucide-react';
import { useJobs } from '../contexts/JobsContext';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useWeb3 } from '../contexts/Web3Context';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import type { Job } from '../contexts/JobsContext';

const MyJobs: React.FC = () => {
  const { jobs } = useJobs();
  const { user } = useAuth();
  const { userRole } = useRole();
  const { userAddress } = useWeb3();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter jobs based on user role
  const userJobs = jobs.filter(job => {
    if (userRole === 'client') {
      // Show jobs submitted by this user (as client)
      return job.requester === userAddress;
    } else {
      // Show jobs taken by this user (as provider)
      return job.provider === userAddress;
    }
  });

  const filteredJobs = userJobs.filter(job => {
    if (searchQuery && !job.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !job.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
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

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'submitted': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      case 'assigned': return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'running': return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'proof_submitted': return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
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

  const getJobStats = () => {
    const total = userJobs.length;
    const submitted = userJobs.filter(job => job.status === 'submitted').length;
    const assigned = userJobs.filter(job => job.status === 'assigned').length;
    const running = userJobs.filter(job => job.status === 'running').length;
    const completed = userJobs.filter(job => job.status === 'completed').length;
    const cancelled = userJobs.filter(job => job.status === 'cancelled').length;
    
    return { total, submitted, assigned, running, completed, cancelled };
  };

  const stats = getJobStats();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase size={28} />
            My Jobs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {userRole === 'client' 
              ? `${filteredJobs.length} jobs submitted • Manage your compute requests` 
              : `${filteredJobs.length} jobs accepted • Track your work progress`
            }
          </p>
        </div>
        
        {userRole === 'client' && (
          <Button className="flex items-center gap-2">
            <Plus size={20} />
            Submit New Job
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.submitted}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Submitted</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Assigned</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Running</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cancelled</div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search your jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neon-blue focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neon-blue focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="running">Running</option>
            <option value="proof_submitted">Proof Submitted</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {userRole === 'client' ? 'No Jobs Submitted' : 'No Jobs Accepted'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {userRole === 'client' 
              ? "You haven't submitted any compute jobs yet. Start by creating your first job!"
              : "You haven't accepted any jobs yet. Browse the marketplace to find work!"
            }
          </p>
          {userRole === 'client' ? (
            <Button>Submit Your First Job</Button>
          ) : (
            <Button>Browse Available Jobs</Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedJob(job)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {job.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
                        {job.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {job.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        {getComputeSizeIcon(job.computeSize)} {job.computeSize}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={16} /> Progress: {job.progress}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap size={16} /> {job.reward} ETZ
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-neon-blue">{job.reward} ETZ</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Reward</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)}>
        {selectedJob && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedJob.name}
              </h2>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedJob.priority)}`}>
                  {selectedJob.priority}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedJob.status)}`}>
                  {selectedJob.status}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedJob.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Compute Size</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {getComputeSizeIcon(selectedJob.computeSize)} {selectedJob.computeSize}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Progress</h3>
                  <p className="text-gray-600 dark:text-gray-400">{selectedJob.progress}%</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Reward</h3>
                <p className="text-2xl font-bold text-neon-blue">{selectedJob.reward} ETZ</p>
              </div>

              {selectedJob.provider && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {userRole === 'client' ? 'Assigned Provider' : 'Job Assignment'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {userRole === 'client' ? `Provider: ${selectedJob.provider}` : 'You are assigned to this job'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
              {selectedJob.status === 'submitted' && userRole === 'client' && (
                <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                  Cancel Job
                </Button>
              )}
              {selectedJob.status === 'running' && (
                <Button>
                  View Progress
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyJobs;
