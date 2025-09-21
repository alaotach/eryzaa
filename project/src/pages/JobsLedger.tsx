import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import jobsLedgerService, { 
  getPhaseText, 
  getPriorityText, 
  JobPhase 
} from '../services/jobsLedgerService';
import { 
  Clock, 
  User, 
  Activity, 
  Search,
  Filter,
  Plus
} from 'lucide-react';

interface JobSummary {
  jobId: number;
  client: string;
  provider: string;
  jobType: string;
  jobDescription: string;
  totalCost: string;
  submitTime: number;
  currentPhase: number;
  priority: number;
  qualityScore: number;
}

const JobsLedger: React.FC = () => {
  const { userAddress, isConnected } = useWeb3();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState<number | 'all'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'client' | 'provider'>('all');

  useEffect(() => {
    if (isConnected && userAddress) {
      loadJobs();
    }
  }, [isConnected, userAddress]);

  useEffect(() => {
    applyFilters();
  }, [jobs, searchTerm, filterPhase, filterRole]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get jobs where user is client
      const clientJobIds = await jobsLedgerService.getClientJobHistory(userAddress);
      
      // Get jobs where user is provider  
      const providerJobIds = await jobsLedgerService.getProviderJobHistory(userAddress);
      
      // Combine and dedupe job IDs
      const allJobIds = [...new Set([...clientJobIds, ...providerJobIds])];
      
      // Load job details for each ID
      const jobPromises = allJobIds.map(async (jobId) => {
        const job = await jobsLedgerService.getJob(jobId);
        return job;
      });

      const jobResults = await Promise.all(jobPromises);
      const validJobs = jobResults.filter((job): job is NonNullable<typeof job> => job !== null);
      
      // Convert to summary format
      const jobSummaries: JobSummary[] = validJobs.map(job => ({
        jobId: job.jobId,
        client: job.client,
        provider: job.provider,
        jobType: job.jobType,
        jobDescription: job.jobDescription,
        totalCost: job.totalCost,
        submitTime: job.submitTime,
        currentPhase: job.currentPhase,
        priority: job.priority,
        qualityScore: job.qualityScore
      }));

      // Sort by submit time (newest first)
      jobSummaries.sort((a, b) => b.submitTime - a.submitTime);

      setJobs(jobSummaries);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.jobType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.jobDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.jobId.toString().includes(searchTerm)
      );
    }

    // Phase filter
    if (filterPhase !== 'all') {
      filtered = filtered.filter(job => job.currentPhase === filterPhase);
    }

    // Role filter
    if (filterRole === 'client') {
      filtered = filtered.filter(job => job.client.toLowerCase() === userAddress.toLowerCase());
    } else if (filterRole === 'provider') {
      filtered = filtered.filter(job => job.provider.toLowerCase() === userAddress.toLowerCase());
    }

    setFilteredJobs(filtered);
  };

  const getPhaseColor = (phase: number): string => {
    switch (phase) {
      case JobPhase.Completed: return 'bg-green-100 text-green-800';
      case JobPhase.Failed: return 'bg-red-100 text-red-800';
      case JobPhase.Disputed: return 'bg-yellow-100 text-yellow-800';
      case JobPhase.Cancelled: return 'bg-gray-100 text-gray-800';
      case JobPhase.Running: return 'bg-blue-100 text-blue-800';
      case JobPhase.Validating: return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 0: return 'bg-gray-100 text-gray-800'; // Low
      case 1: return 'bg-blue-100 text-blue-800'; // Normal
      case 2: return 'bg-orange-100 text-orange-800'; // High
      case 3: return 'bg-red-100 text-red-800'; // Urgent
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const truncateDescription = (description: string, maxLength: number = 100): string => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  const isUserClient = (job: JobSummary): boolean => {
    return job.client.toLowerCase() === userAddress.toLowerCase();
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view your jobs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Jobs Ledger</h1>
          <p className="text-gray-600">Track and manage your compute jobs</p>
        </div>
        <Link 
          to="/create-job"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Phase Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">All Phases</option>
              <option value={JobPhase.Submitted}>Submitted</option>
              <option value={JobPhase.Funded}>Funded</option>
              <option value={JobPhase.Assigned}>Assigned</option>
              <option value={JobPhase.Running}>Running</option>
              <option value={JobPhase.Validating}>Validating</option>
              <option value={JobPhase.Completed}>Completed</option>
              <option value={JobPhase.Failed}>Failed</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as 'all' | 'client' | 'provider')}
            >
              <option value="all">All Roles</option>
              <option value="client">As Client</option>
              <option value="provider">As Provider</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-600">
            {filteredJobs.length} of {jobs.length} jobs
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Activity className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Error Loading Jobs</p>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={loadJobs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
          <p className="text-gray-600 mb-4">
            {jobs.length === 0 
              ? "You haven't submitted or worked on any jobs yet."
              : "No jobs match your current filters."
            }
          </p>
          {jobs.length === 0 && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Your First Job
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link 
              key={job.jobId} 
              to={`/jobs/${job.jobId}`}
              className="block bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">Job #{job.jobId}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(job.currentPhase)}`}>
                        {getPhaseText(job.currentPhase)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
                        {getPriorityText(job.priority)}
                      </span>
                      {isUserClient(job) ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Client
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Provider
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{job.jobType}</p>
                    <p className="text-sm text-gray-600 mb-3">{truncateDescription(job.jobDescription)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{job.totalCost} AVAX</p>
                    {job.qualityScore > 0 && (
                      <p className="text-sm text-green-600">★ {job.qualityScore}/100</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatTimestamp(job.submitTime)}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span>Client: {job.client.substring(0, 8)}...</span>
                    </div>
                    {job.provider && job.provider !== '0x0000000000000000000000000000000000000000' && (
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-1" />
                        <span>Provider: {job.provider.substring(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                  <div className="text-blue-600 hover:text-blue-800">
                    View Details →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobsLedger;
