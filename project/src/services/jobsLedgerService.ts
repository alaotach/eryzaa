import { ethers, BrowserProvider, Contract, formatEther } from 'ethers';

// Jobs Ledger ABI (essential functions)
const JOBS_LEDGER_ABI = [
  // Job submission and management
  'function submitJob(address client, string jobType, string description, string inputDataHash, string configHash, uint256 estimatedDuration, uint256 totalCost, uint8 priority, bool isPrivate, string metadata) external returns (uint256)',
  'function updateJobPhase(uint256 jobId, uint8 newPhase) external',
  'function assignJob(uint256 jobId, address provider, uint256 nodeId) external',
  'function startJobExecution(uint256 jobId) external',
  'function completeJob(uint256 jobId, uint8 result, string outputDataHash, uint8 qualityScore) external',
  
  // Metrics and rating
  'function recordExecutionMetrics(uint256 jobId, uint256 cpuUsage, uint256 memoryUsage, uint256 gpuUsage, uint256 networkIO, uint256 diskIO, uint256 energyConsumed, string performanceData) external',
  'function rateJobQuality(uint256 jobId, uint8 rating) external',
  
  // View functions
  'function getJob(uint256 jobId) external view returns (tuple(uint256 jobId, address client, address provider, uint256 nodeId, string jobType, string jobDescription, string inputDataHash, string outputDataHash, string configHash, uint256 estimatedDuration, uint256 actualDuration, uint256 totalCost, uint256 submitTime, uint256 startTime, uint256 endTime, uint8 currentPhase, uint8 priority, uint8 result, uint8 qualityScore, bool isPrivate, string metadata))',
  'function getJobMetrics(uint256 jobId) external view returns (tuple(uint256 cpuUsage, uint256 memoryUsage, uint256 gpuUsage, uint256 networkIO, uint256 diskIO, uint256 energyConsumed, string performanceData))',
  'function getJobPhaseHistory(uint256 jobId) external view returns (uint8[] phases, uint256[] timestamps)',
  'function getNodePerformance(address provider) external view returns (tuple(uint256 totalJobs, uint256 successfulJobs, uint256 failedJobs, uint256 totalRevenue, uint256 totalExecutionTime, uint256 averageQualityScore, uint256 uptime, uint256 lastActiveTime, uint8 reliabilityScore))',
  'function getClientAnalytics(address client) external view returns (tuple(uint256 totalJobsSubmitted, uint256 totalSpent, uint256 totalExecutionTime, uint256 averageJobDuration, uint256 successfulJobs, uint256 lastActivity, uint8 reputationScore))',
  'function getClientJobHistory(address client) external view returns (uint256[])',
  'function getProviderJobHistory(address provider) external view returns (uint256[])',
  'function getNodeJobHistory(uint256 nodeId) external view returns (uint256[])',
  'function getJobsByPhase(uint8 phase) external view returns (uint256[])',
  'function getPlatformAnalytics() external view returns (uint256 totalJobs, uint256 completedJobs, uint256 failedJobs, uint256 totalRevenue, uint256 averageJobDuration)',
  
  // Events
  'event JobSubmitted(uint256 indexed jobId, address indexed client, string jobType, uint8 priority, uint256 estimatedDuration)',
  'event JobPhaseChanged(uint256 indexed jobId, uint8 oldPhase, uint8 newPhase, uint256 timestamp)',
  'event JobAssigned(uint256 indexed jobId, address indexed provider, uint256 indexed nodeId, uint256 assignedTime)',
  'event JobExecutionStarted(uint256 indexed jobId, uint256 startTime)',
  'event JobCompleted(uint256 indexed jobId, uint8 result, uint8 qualityScore, uint256 endTime)',
  'event MetricsRecorded(uint256 indexed jobId, uint256 cpuUsage, uint256 memoryUsage, uint256 gpuUsage)',
  'event QualityRated(uint256 indexed jobId, uint8 rating, address rater)'
];

// Job Phase enum mapping
export const JobPhase = {
  Submitted: 0,
  Funded: 1,
  Assigned: 2,
  Running: 3,
  Validating: 4,
  Completed: 5,
  Failed: 6,
  Disputed: 7,
  Cancelled: 8,
  Refunded: 9
};

// Priority enum mapping
export const Priority = {
  Low: 0,
  Normal: 1,
  High: 2,
  Urgent: 3
};

// Execution Result enum mapping
export const ExecutionResult = {
  Pending: 0,
  Success: 1,
  Failed: 2,
  TimedOut: 3,
  Cancelled: 4,
  NodeOffline: 5,
  InvalidOutput: 6
};

// Get phase name from enum value
export const getPhaseText = (phase: number): string => {
  const phases = ['Submitted', 'Funded', 'Assigned', 'Running', 'Validating', 'Completed', 'Failed', 'Disputed', 'Cancelled', 'Refunded'];
  return phases[phase] || 'Unknown';
};

// Get priority text from enum value
export const getPriorityText = (priority: number): string => {
  const priorities = ['Low', 'Normal', 'High', 'Urgent'];
  return priorities[priority] || 'Unknown';
};

// Get result text from enum value
export const getResultText = (result: number): string => {
  const results = ['Pending', 'Success', 'Failed', 'Timed Out', 'Cancelled', 'Node Offline', 'Invalid Output'];
  return results[result] || 'Unknown';
};

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

interface NodePerformance {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalRevenue: string;
  totalExecutionTime: number;
  averageQualityScore: number;
  uptime: number;
  lastActiveTime: number;
  reliabilityScore: number;
}

interface ClientAnalytics {
  totalJobsSubmitted: number;
  totalSpent: string;
  totalExecutionTime: number;
  averageJobDuration: number;
  successfulJobs: number;
  lastActivity: number;
  reputationScore: number;
}

interface PlatformAnalytics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalRevenue: string;
  averageJobDuration: number;
}

class JobsLedgerService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.BrowserProvider | null = null;

  constructor() {
    this.initializeContract();
  }

  private async initializeContract() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        const contractAddress = import.meta.env.VITE_JOBS_LEDGER_ADDRESS || '';
        
        if (contractAddress) {
          this.contract = new ethers.Contract(contractAddress, JOBS_LEDGER_ABI, this.provider);
          console.log('✅ Jobs Ledger contract initialized');
        } else {
          console.log('❌ Jobs Ledger contract address not found');
        }
      } catch (error) {
        console.error('Failed to initialize Jobs Ledger contract:', error);
      }
    }
  }

  // Submit a new job
  async submitJob(
    client: string,
    jobType: string,
    description: string,
    inputDataHash: string,
    configHash: string,
    estimatedDuration: number,
    totalCost: string,
    priority: number = Priority.Normal,
    isPrivate: boolean = false,
    metadata: string = ''
  ): Promise<{ success: boolean; jobId?: number; error?: string }> {
    try {
      if (!this.contract || !this.provider) {
        throw new Error('Contract not initialized');
      }

      const signer = await this.provider.getSigner();
      const contractWithSigner = this.contract.connect(signer);

      const tx = await contractWithSigner.submitJob(
        client,
        jobType,
        description,
        inputDataHash,
        configHash,
        estimatedDuration,
        totalCost,
        priority,
        isPrivate,
        metadata
      );

      const receipt = await tx.wait();
      
      // Extract job ID from the event
      const jobSubmittedEvent = receipt.events?.find(
        (event: any) => event.event === 'JobSubmitted'
      );
      
      if (jobSubmittedEvent) {
        const jobId = Number(jobSubmittedEvent.args?.jobId);
        return { success: true, jobId };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to submit job:', error);
      return { success: false, error: error.message };
    }
  }

  // Get job details
  async getJob(jobId: number): Promise<JobRecord | null> {
    try {
      if (!this.contract) {
        console.log('Contract not initialized');
        return null;
      }

      const jobData = await this.contract.getJob(jobId);
      
      return {
        jobId: Number(jobData.jobId),
        client: jobData.client,
        provider: jobData.provider,
        nodeId: Number(jobData.nodeId),
        jobType: jobData.jobType,
        jobDescription: jobData.jobDescription,
        inputDataHash: jobData.inputDataHash,
        outputDataHash: jobData.outputDataHash,
        configHash: jobData.configHash,
        estimatedDuration: Number(jobData.estimatedDuration),
        actualDuration: Number(jobData.actualDuration),
        totalCost: ethers.formatEther(jobData.totalCost),
        submitTime: Number(jobData.submitTime),
        startTime: Number(jobData.startTime),
        endTime: Number(jobData.endTime),
        currentPhase: Number(jobData.currentPhase),
        priority: Number(jobData.priority),
        result: Number(jobData.result),
        qualityScore: Number(jobData.qualityScore),
        isPrivate: jobData.isPrivate,
        metadata: jobData.metadata
      };
    } catch (error) {
      console.error('Failed to get job:', error);
      return null;
    }
  }

  // Get job execution metrics
  async getJobMetrics(jobId: number): Promise<ExecutionMetrics | null> {
    try {
      if (!this.contract) return null;

      const metrics = await this.contract.getJobMetrics(jobId);
      
      return {
        cpuUsage: Number(metrics.cpuUsage),
        memoryUsage: Number(metrics.memoryUsage),
        gpuUsage: Number(metrics.gpuUsage),
        networkIO: Number(metrics.networkIO),
        diskIO: Number(metrics.diskIO),
        energyConsumed: Number(metrics.energyConsumed),
        performanceData: metrics.performanceData
      };
    } catch (error) {
      console.error('Failed to get job metrics:', error);
      return null;
    }
  }

  // Get job phase history
  async getJobPhaseHistory(jobId: number): Promise<{ phases: number[]; timestamps: number[] } | null> {
    try {
      if (!this.contract) return null;

      const history = await this.contract.getJobPhaseHistory(jobId);
      
      return {
        phases: history.phases.map((phase: any) => Number(phase)),
        timestamps: history.timestamps.map((timestamp: any) => Number(timestamp))
      };
    } catch (error) {
      console.error('Failed to get job phase history:', error);
      return null;
    }
  }

  // Get client's job history
  async getClientJobHistory(clientAddress: string): Promise<number[]> {
    try {
      if (!this.contract) return [];

      const jobIds = await this.contract.getClientJobHistory(clientAddress);
      return jobIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Failed to get client job history:', error);
      return [];
    }
  }

  // Get provider's job history
  async getProviderJobHistory(providerAddress: string): Promise<number[]> {
    try {
      if (!this.contract) return [];

      const jobIds = await this.contract.getProviderJobHistory(providerAddress);
      return jobIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Failed to get provider job history:', error);
      return [];
    }
  }

  // Get jobs by phase
  async getJobsByPhase(phase: number): Promise<number[]> {
    try {
      if (!this.contract) return [];

      const jobIds = await this.contract.getJobsByPhase(phase);
      return jobIds.map((id: any) => Number(id));
    } catch (error) {
      console.error('Failed to get jobs by phase:', error);
      return [];
    }
  }

  // Get client analytics
  async getClientAnalytics(clientAddress: string): Promise<ClientAnalytics | null> {
    try {
      if (!this.contract) return null;

      const analytics = await this.contract.getClientAnalytics(clientAddress);
      
      return {
        totalJobsSubmitted: Number(analytics.totalJobsSubmitted),
        totalSpent: ethers.formatEther(analytics.totalSpent),
        totalExecutionTime: Number(analytics.totalExecutionTime),
        averageJobDuration: Number(analytics.averageJobDuration),
        successfulJobs: Number(analytics.successfulJobs),
        lastActivity: Number(analytics.lastActivity),
        reputationScore: Number(analytics.reputationScore)
      };
    } catch (error) {
      console.error('Failed to get client analytics:', error);
      return null;
    }
  }

  // Get node performance
  async getNodePerformance(providerAddress: string): Promise<NodePerformance | null> {
    try {
      if (!this.contract) return null;

      const performance = await this.contract.getNodePerformance(providerAddress);
      
      return {
        totalJobs: Number(performance.totalJobs),
        successfulJobs: Number(performance.successfulJobs),
        failedJobs: Number(performance.failedJobs),
        totalRevenue: ethers.formatEther(performance.totalRevenue),
        totalExecutionTime: Number(performance.totalExecutionTime),
        averageQualityScore: Number(performance.averageQualityScore),
        uptime: Number(performance.uptime),
        lastActiveTime: Number(performance.lastActiveTime),
        reliabilityScore: Number(performance.reliabilityScore)
      };
    } catch (error) {
      console.error('Failed to get node performance:', error);
      return null;
    }
  }

  // Get platform analytics
  async getPlatformAnalytics(): Promise<PlatformAnalytics | null> {
    try {
      if (!this.contract) return null;

      const analytics = await this.contract.getPlatformAnalytics();
      
      return {
        totalJobs: Number(analytics.totalJobs),
        completedJobs: Number(analytics.completedJobs),
        failedJobs: Number(analytics.failedJobs),
        totalRevenue: ethers.formatEther(analytics.totalRevenue),
        averageJobDuration: Number(analytics.averageJobDuration)
      };
    } catch (error) {
      console.error('Failed to get platform analytics:', error);
      return null;
    }
  }

  // Update job phase (for authorized users)
  async updateJobPhase(jobId: number, newPhase: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.contract || !this.provider) {
        throw new Error('Contract not initialized');
      }

      const signer = await this.provider.getSigner();
      const contractWithSigner = this.contract.connect(signer);

      const tx = await contractWithSigner.updateJobPhase(jobId, newPhase);
      await tx.wait();

      return { success: true };
    } catch (error: any) {
      console.error('Failed to update job phase:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete job execution
  async completeJob(
    jobId: number,
    result: number,
    outputDataHash: string,
    qualityScore: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.contract || !this.provider) {
        throw new Error('Contract not initialized');
      }

      const signer = await this.provider.getSigner();
      const contractWithSigner = this.contract.connect(signer);

      const tx = await contractWithSigner.completeJob(jobId, result, outputDataHash, qualityScore);
      await tx.wait();

      return { success: true };
    } catch (error: any) {
      console.error('Failed to complete job:', error);
      return { success: false, error: error.message };
    }
  }

  // Rate job quality
  async rateJobQuality(jobId: number, rating: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.contract || !this.provider) {
        throw new Error('Contract not initialized');
      }

      const signer = await this.provider.getSigner();
      const contractWithSigner = this.contract.connect(signer);

      const tx = await contractWithSigner.rateJobQuality(jobId, rating);
      await tx.wait();

      return { success: true };
    } catch (error: any) {
      console.error('Failed to rate job quality:', error);
      return { success: false, error: error.message };
    }
  }

  // Listen to job events
  listenToJobEvents(callback: (event: any) => void) {
    if (!this.contract) return;

    // Listen to all job-related events
    this.contract.on('JobSubmitted', (jobId, client, jobType, priority, estimatedDuration, event) => {
      callback({
        type: 'JobSubmitted',
        jobId: Number(jobId),
        client,
        jobType,
        priority: Number(priority),
        estimatedDuration: Number(estimatedDuration),
        event
      });
    });

    this.contract.on('JobPhaseChanged', (jobId, oldPhase, newPhase, timestamp, event) => {
      callback({
        type: 'JobPhaseChanged',
        jobId: Number(jobId),
        oldPhase: Number(oldPhase),
        newPhase: Number(newPhase),
        timestamp: Number(timestamp),
        event
      });
    });

    this.contract.on('JobCompleted', (jobId, result, actualDuration, qualityScore, event) => {
      callback({
        type: 'JobCompleted',
        jobId: Number(jobId),
        result: Number(result),
        actualDuration: Number(actualDuration),
        qualityScore: Number(qualityScore),
        event
      });
    });
  }

  // Stop listening to events
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

export default new JobsLedgerService();
