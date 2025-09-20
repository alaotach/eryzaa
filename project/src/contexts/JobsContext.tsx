import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export const useJobs = () => {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  return context;
};

// Mock seed data
const seedJobs: Job[] = [
  {
    id: 'job_1',
    name: 'Image Classification Model Training',
    description: 'Train a CNN model on a dataset of 10,000 images for multi-class classification. Requires GPU compute with at least 8GB VRAM.',
    reward: 150,
    computeSize: 'large',
    priority: 'urgent',
    status: 'submitted',
    requester: 'researcher_ai',
    progress: 0,
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
    requesterReputation: 4.8,
    tokensLocked: 150,
    fileSize: '2.3GB'
  },
  {
    id: 'job_2',
    name: 'Natural Language Processing Task',
    description: 'Fine-tune a transformer model for sentiment analysis on customer reviews. Dataset includes 50k samples.',
    reward: 85,
    computeSize: 'medium',
    priority: 'normal',
    status: 'running',
    requester: 'startup_nlp',
    provider: 'provider_123',
    progress: 45,
    createdAt: new Date('2024-01-14T14:20:00'),
    updatedAt: new Date('2024-01-15T09:15:00'),
    requesterReputation: 4.2,
    tokensLocked: 85,
    fileSize: '500MB'
  },
  {
    id: 'job_3',
    name: 'Reinforcement Learning Simulation',
    description: 'Train an RL agent to play a custom game environment. Requires extended compute time with stable connection.',
    reward: 200,
    computeSize: 'large',
    priority: 'normal',
    status: 'submitted',
    requester: 'game_ai_lab',
    progress: 0,
    createdAt: new Date('2024-01-15T08:45:00'),
    updatedAt: new Date('2024-01-15T08:45:00'),
    requesterReputation: 4.6,
    tokensLocked: 200,
    fileSize: '1.8GB'
  }
];

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);

  useEffect(() => {
    // Load jobs from localStorage or use seed data
    const savedJobs = localStorage.getItem('eryza_jobs');
    if (savedJobs) {
      const parsedJobs = JSON.parse(savedJobs).map((job: any) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt)
      }));
      setJobs(parsedJobs);
    } else {
      setJobs(seedJobs);
      localStorage.setItem('eryza_jobs', JSON.stringify(seedJobs));
    }

    // Load my jobs
    const savedMyJobs = localStorage.getItem('eryza_my_jobs');
    if (savedMyJobs) {
      const parsedMyJobs = JSON.parse(savedMyJobs).map((job: any) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt)
      }));
      setMyJobs(parsedMyJobs);
    }
  }, []);

  const addJob = (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newJob: Job = {
      ...jobData,
      id: 'job_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedJobs = [...jobs, newJob];
    const updatedMyJobs = [...myJobs, newJob];
    
    setJobs(updatedJobs);
    setMyJobs(updatedMyJobs);
    localStorage.setItem('eryza_jobs', JSON.stringify(updatedJobs));
    localStorage.setItem('eryza_my_jobs', JSON.stringify(updatedMyJobs));
  };

  const takeJob = (jobId: string, providerId: string) => {
    const updatedJobs = jobs.map(job => 
      job.id === jobId 
        ? { ...job, provider: providerId, status: 'assigned' as Job['status'], updatedAt: new Date() }
        : job
    );
    
    const takenJob = updatedJobs.find(job => job.id === jobId);
    const updatedMyJobs = takenJob ? [...myJobs, takenJob] : myJobs;
    
    setJobs(updatedJobs);
    setMyJobs(updatedMyJobs);
    localStorage.setItem('eryza_jobs', JSON.stringify(updatedJobs));
    localStorage.setItem('eryza_my_jobs', JSON.stringify(updatedMyJobs));
  };

  const updateJobStatus = (jobId: string, status: Job['status'], progress?: number) => {
    const updateJobInArray = (jobArray: Job[]) => jobArray.map(job => 
      job.id === jobId 
        ? { 
            ...job, 
            status, 
            progress: progress !== undefined ? progress : job.progress,
            updatedAt: new Date() 
          }
        : job
    );

    const updatedJobs = updateJobInArray(jobs);
    const updatedMyJobs = updateJobInArray(myJobs);
    
    setJobs(updatedJobs);
    setMyJobs(updatedMyJobs);
    localStorage.setItem('eryza_jobs', JSON.stringify(updatedJobs));
    localStorage.setItem('eryza_my_jobs', JSON.stringify(updatedMyJobs));
  };

  const searchJobs = (query: string) => {
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
      filterJobs
    }}>
      {children}
    </JobsContext.Provider>
  );
};