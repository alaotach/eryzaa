import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Activity, 
  BarChart3, 
  XCircle,
  Star,
  Cpu,
  HardDrive,
  Zap,
  ArrowLeft,
  History,
  Award,
  TrendingUp
} from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import jobsLedgerService, { 
  getPhaseText, 
  getPriorityText, 
  getResultText, 
  JobPhase
} from '../services/jobsLedgerService';

interface JobRecord {
  jobId: number;
  client: string;
  provider: string;
  nodeId: number;
  jobType: string;
  jobDescription: string;
  inputDataHash: string;
  outputDataHash: string;
  configHash: string;
  estimatedDuration: number;
  actualDuration: number;
  totalCost: string;
  submitTime: number;
  startTime: number;
  endTime: number;
  currentPhase: number;
  priority: number;
  result: number;
  qualityScore: number;
  isPrivate: boolean;
  metadata: string;
}

interface ExecutionMetrics {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  networkIO: number;
  diskIO: number;
  energyConsumed: number;
  performanceData: string;
}

interface PhaseHistory {
  phases: number[];
  timestamps: number[];
}

const JobDetails: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { userAddress, isConnected } = useWeb3();
  
  const [job, setJob] = useState<JobRecord | null>(null);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [phaseHistory, setPhaseHistory] = useState<PhaseHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (jobId && isConnected) {
      loadJobDetails();
    }
  }, [jobId, isConnected]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const jobData = await jobsLedgerService.getJob(Number(jobId));
      if (!jobData) {
        setError('Job not found');
        return;
      }

      setJob(jobData);

      // Load metrics if job is running or completed
      if (jobData.currentPhase >= JobPhase.Running) {
        const metricsData = await jobsLedgerService.getJobMetrics(Number(jobId));
        setMetrics(metricsData);
      }

      // Load phase history
      const historyData = await jobsLedgerService.getJobPhaseHistory(Number(jobId));
      setPhaseHistory(historyData);

    } catch (err: any) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleRateJob = async () => {
    if (!job || rating === 0) return;

    try {
      setSubmittingRating(true);
      const result = await jobsLedgerService.rateJobQuality(job.jobId, rating);
      
      if (result.success) {
        // Reload job to get updated quality score
        await loadJobDetails();
        setRating(0);
      } else {
        setError(result.error || 'Failed to submit rating');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const getPhaseProgress = (phase: number): number => {
    const phases = [
      JobPhase.Submitted,
      JobPhase.Funded,
      JobPhase.Assigned,
      JobPhase.Running,
      JobPhase.Validating,
      JobPhase.Completed
    ];
    const index = phases.indexOf(phase);
    return index >= 0 ? ((index + 1) / phases.length) * 100 : 0;
  };

  const getPhaseColor = (phase: number): string => {
    switch (phase) {
      case JobPhase.Completed: return 'bg-green-500';
      case JobPhase.Failed: return 'bg-red-500';
      case JobPhase.Disputed: return 'bg-yellow-500';
      case JobPhase.Cancelled: return 'bg-gray-500';
      case JobPhase.Running: return 'bg-blue-500';
      case JobPhase.Validating: return 'bg-purple-500';
      default: return 'bg-blue-500';
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

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canRateJob = (): boolean => {
    return job !== null && 
           !!userAddress && 
           (job.client.toLowerCase() === userAddress.toLowerCase()) &&
           job.currentPhase === JobPhase.Completed &&
           job.qualityScore === 0; // Only if not rated yet
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view job details.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Job not found'}</p>
          <button 
            onClick={() => navigate('/jobs')} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/jobs')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold">Job #{job.jobId}</h1>
            <p className="text-gray-600">{job.jobType}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
            {getPriorityText(job.priority)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(job.currentPhase)} text-white`}>
            {getPhaseText(job.currentPhase)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Job Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Overview */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Activity className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-semibold">Job Overview</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-gray-700">{job.jobDescription}</p>
              </div>
              
              <hr className="border-gray-200" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Client</p>
                  <p className="font-mono text-sm">{job.client}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Provider</p>
                  <p className="font-mono text-sm">{job.provider || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Node ID</p>
                  <p className="font-mono text-sm">{job.nodeId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Cost</p>
                  <p className="font-semibold">{job.totalCost} AVAX</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <History className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-semibold">Progress Timeline</h3>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{Math.round(getPhaseProgress(job.currentPhase))}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${getPhaseProgress(job.currentPhase)}%` }}
                ></div>
              </div>
            </div>
            
            {phaseHistory && (
              <div className="space-y-2">
                {phaseHistory.phases.map((phase, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getPhaseColor(phase)}`} />
                      <span className="font-medium">{getPhaseText(phase)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(phaseHistory.timestamps[index])}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execution Metrics */}
          {metrics && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-5 w-5 mr-2" />
                <h3 className="text-lg font-semibold">Execution Metrics</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Cpu className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-semibold">{metrics.cpuUsage}%</p>
                  <p className="text-sm text-gray-600">CPU Usage</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <HardDrive className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold">{formatBytes(metrics.memoryUsage)}</p>
                  <p className="text-sm text-gray-600">Memory Used</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="font-semibold">{metrics.gpuUsage}%</p>
                  <p className="text-sm text-gray-600">GPU Usage</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Zap className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="font-semibold">{formatBytes(metrics.energyConsumed)}</p>
                  <p className="text-sm text-gray-600">Energy Used</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <Activity className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="font-semibold">{formatBytes(metrics.networkIO)}</p>
                  <p className="text-sm text-gray-600">Network I/O</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <HardDrive className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="font-semibold">{formatBytes(metrics.diskIO)}</p>
                  <p className="text-sm text-gray-600">Disk I/O</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-semibold">Status & Timing</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Current Phase</p>
                <p className="font-semibold">{getPhaseText(job.currentPhase)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Result</p>
                <p className="font-semibold">{getResultText(job.result)}</p>
              </div>
              
              <hr className="border-gray-200" />
              
              <div>
                <p className="text-sm font-medium text-gray-500">Submitted</p>
                <p className="text-sm">{formatTimestamp(job.submitTime)}</p>
              </div>
              
              {job.startTime > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Started</p>
                  <p className="text-sm">{formatTimestamp(job.startTime)}</p>
                </div>
              )}
              
              {job.endTime > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-sm">{formatTimestamp(job.endTime)}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Estimated Duration</p>
                <p className="text-sm">{formatDuration(job.estimatedDuration)}</p>
              </div>
              
              {job.actualDuration > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Actual Duration</p>
                  <p className="text-sm">{formatDuration(job.actualDuration)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quality Score */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Award className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-semibold">Quality Score</h3>
            </div>
            {job.qualityScore > 0 ? (
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {job.qualityScore}/100
                </div>
                <div className="flex justify-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(job.qualityScore / 20)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : canRateJob() ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Rate this job's quality (1-5 stars)
                </p>
                <div className="flex justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        star <= rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>
                {rating > 0 && (
                  <button
                    onClick={handleRateJob}
                    disabled={submittingRating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingRating ? 'Submitting...' : 'Submit Rating'}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <Star className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Not rated yet</p>
              </div>
            )}
          </div>

          {/* Data Hashes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Data & Config</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Input Data Hash</p>
                <p className="font-mono text-xs break-all">{job.inputDataHash}</p>
              </div>
              
              {job.outputDataHash && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Output Data Hash</p>
                  <p className="font-mono text-xs break-all">{job.outputDataHash}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Config Hash</p>
                <p className="font-mono text-xs break-all">{job.configHash}</p>
              </div>
              
              {job.metadata && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Metadata</p>
                  <p className="text-xs text-gray-600">{job.metadata}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
