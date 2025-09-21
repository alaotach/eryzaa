import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';

export interface Job {
  id: string;
  name: string;
  description: string;
  reward: number;
  computeSize: 'small' | 'medium' | 'large';
  priority: 'low' | 'normal' | 'urgent';
  status: 'submitted' | 'assigned' | 'running' | 'proof_submitted' | 'completed' | 'cancelled';
  requester: string;
  provider?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  requesterReputation: number;
  tokensLocked: number;
  fileSize?: string;
}

interface JobsContextType {
  jobs: Job[];
  myJobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => void;
  takeJob: (jobId: string, providerId: string) => void;
  updateJobStatus: (jobId: string, status: Job['status'], progress?: number) => void;
  searchJobs: (query: string) => Job[];
  filterJobs: (filters: any) => Job[];
  refreshFromBlockchain: () => Promise<void>;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export const useJobs = () => {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  return context;
};

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const { userJobs, isConnected } = useWeb3();

  // Convert blockchain JobInfo to our Job interface
  const convertBlockchainJob = (blockchainJob: any): Job => {
    const getStatusString = (status: number): Job['status'] => {
      switch (status) {
        case 0: return 'submitted';
        case 1: return 'assigned';
        case 2: return 'running';
        case 3: return 'proof_submitted';
        case 8: return 'completed';
        default: return 'submitted';
      }
    };

    const getComputeSize = (duration: number): 'small' | 'medium' | 'large' => {
      if (duration <= 1) return 'small';
      if (duration <= 4) return 'medium';
      return 'large';
    };

    return {
      id: `blockchain_${blockchainJob.id}`,
      name: blockchainJob.jobType || `Compute Job ${blockchainJob.id}`,
      description: blockchainJob.jobConfig || 'Blockchain compute job',
      reward: parseFloat(blockchainJob.totalCost) || 0,
      computeSize: getComputeSize(blockchainJob.duration),
      priority: blockchainJob.duration > 8 ? 'urgent' : 'normal',
      status: getStatusString(blockchainJob.status),
      requester: blockchainJob.client || 'Unknown',
      provider: blockchainJob.provider !== '0x0000000000000000000000000000000000000000' ? blockchainJob.provider : undefined,
      progress: blockchainJob.status === 8 ? 100 : blockchainJob.status === 2 ? 50 : 0,
      createdAt: new Date(blockchainJob.startTime * 1000) || new Date(),
      updatedAt: new Date(),
      requesterReputation: 5.0,
      tokensLocked: parseFloat(blockchainJob.totalCost) || 0,
      fileSize: blockchainJob.duration > 4 ? '2.0GB' : '500MB'
    };
  };

  useEffect(() => {
    if (isConnected && userJobs.length > 0) {
      // Only show blockchain data when connected
      const blockchainJobs = userJobs.map(convertBlockchainJob);
      setMyJobs(blockchainJobs);
      setJobs(blockchainJobs);
    } else {
      // Show empty arrays when not connected or no data
      setJobs([]);
      setMyJobs([]);
    }
  }, [isConnected, userJobs]);

  const refreshFromBlockchain = async () => {
    if (isConnected && userJobs.length > 0) {
      const blockchainJobs = userJobs.map(convertBlockchainJob);
      setMyJobs(blockchainJobs);
      setJobs(blockchainJobs);
    }
  };

  const addJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('Adding job to blockchain:', jobData);
    // This would integrate with Web3Context to create blockchain job
  };

  const takeJob = (jobId: string, providerId: string) => {
    console.log('Taking job:', jobId, 'by provider:', providerId);
    // This would integrate with Web3Context to take blockchain job
  };

  const updateJobStatus = (jobId: string, status: Job['status'], progress?: number) => {
    console.log('Updating job status:', jobId, status, progress);
    // This would integrate with Web3Context to update blockchain job
  };

  const searchJobs = (query: string) => {
    if (!query.trim()) return jobs;
    return jobs.filter(job => 
      job.name.toLowerCase().includes(query.toLowerCase()) ||
      job.description.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filterJobs = (filters: any) => {
    return jobs.filter(job => {
      if (filters.computeSize && job.computeSize !== filters.computeSize) return false;
      if (filters.priority && job.priority !== filters.priority) return false;
      if (filters.minReward && job.reward < filters.minReward) return false;
      if (filters.maxReward && job.reward > filters.maxReward) return false;
      return true;
    });
  };

  return (
    <JobsContext.Provider value={{
      jobs,
      myJobs,
      addJob,
      takeJob,
      updateJobStatus,
      searchJobs,
      filterJobs,
      refreshFromBlockchain
    }}>
      {children}
    </JobsContext.Provider>
  );
};