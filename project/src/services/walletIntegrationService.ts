// Wallet Integration Service - Links MongoDB users with blockchain addresses
import authService from './authService';
import blockchainService from './blockchainService';
import jobsLedgerService from './jobsLedgerService';

export interface WalletLinkStatus {
  isLinked: boolean;
  walletAddress?: string;
  blockchainDataAvailable?: boolean;
  error?: string;
}

export interface UserBlockchainData {
  // Client data from blockchain
  clientJobs: any[];
  clientAnalytics: any;
  
  // Provider data from blockchain
  providerJobs: any[];
  providerNodes: any[];
  providerAnalytics: any;
  
  // Combined data
  tokenBalance: string;
  totalTransactions: number;
}

class WalletIntegrationService {
  
  /**
   * Link user's MongoDB account with their wallet address
   */
  async linkWallet(walletAddress: string): Promise<WalletLinkStatus> {
    try {
      // Validate wallet address format
      if (!this.isValidEthereumAddress(walletAddress)) {
        return {
          isLinked: false,
          error: 'Invalid wallet address format'
        };
      }

      // Update user profile in MongoDB with wallet address
      const authResponse = await authService.connectWallet(walletAddress);
      
      if (!authResponse.success) {
        return {
          isLinked: false,
          error: authResponse.error || 'Failed to link wallet to account'
        };
      }

      // Verify blockchain connectivity
      const blockchainConnected = await this.verifyBlockchainConnection(walletAddress);

      return {
        isLinked: true,
        walletAddress,
        blockchainDataAvailable: blockchainConnected
      };
    } catch (error) {
      console.error('Error linking wallet:', error);
      return {
        isLinked: false,
        error: 'Network error while linking wallet'
      };
    }
  }

  /**
   * Get comprehensive user data from both MongoDB and blockchain
   */
  async getUserData(walletAddress?: string): Promise<UserBlockchainData | null> {
    try {
      const user = authService.getUser();
      const userWallet = walletAddress || user?.walletAddress;

      if (!userWallet) {
        console.warn('No wallet address available for blockchain data fetch');
        return null;
      }

      console.log(`🔗 Fetching blockchain data for wallet: ${userWallet}`);

      // Fetch blockchain data in parallel
      const [
        clientJobIds,
        providerJobIds,
        clientAnalytics,
        providerPerformance,
        tokenBalance,
        nodes
      ] = await Promise.allSettled([
        jobsLedgerService.getClientJobHistory(userWallet),
        jobsLedgerService.getProviderJobHistory(userWallet),
        jobsLedgerService.getClientAnalytics(userWallet),
        jobsLedgerService.getNodePerformance(userWallet),
        blockchainService.getTokenBalance(userWallet),
        blockchainService.getAvailableNodes()
      ]);

      // Fetch detailed job data
      const clientJobs = await this.fetchJobDetails(
        clientJobIds.status === 'fulfilled' ? clientJobIds.value : []
      );
      const providerJobs = await this.fetchJobDetails(
        providerJobIds.status === 'fulfilled' ? providerJobIds.value : []
      );

      // Filter provider nodes (nodes owned by this user)
      const allNodes = nodes.status === 'fulfilled' ? nodes.value : [];
      const userNodes = allNodes.filter((node: any) => 
        node.provider?.toLowerCase() === userWallet.toLowerCase()
      );

      return {
        clientJobs,
        clientAnalytics: clientAnalytics.status === 'fulfilled' ? clientAnalytics.value : null,
        providerJobs,
        providerNodes: userNodes,
        providerAnalytics: providerPerformance.status === 'fulfilled' ? providerPerformance.value : null,
        tokenBalance: tokenBalance.status === 'fulfilled' ? 
          (typeof tokenBalance.value === 'string' ? tokenBalance.value : '0') : '0',
        totalTransactions: this.calculateTotalTransactions(clientJobs, providerJobs)
      };
    } catch (error) {
      console.error('Error fetching user blockchain data:', error);
      return null;
    }
  }

  /**
   * Fetch detailed job data for given job IDs
   */
  private async fetchJobDetails(jobIds: number[]): Promise<any[]> {
    const jobs = await Promise.allSettled(
      jobIds.map(id => jobsLedgerService.getJob(id))
    );
    
    return jobs
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as any).value);
  }

  /**
   * Save job data to blockchain when user creates a job
   */
  async saveJobToBlockchain(jobData: {
    jobType: string;
    description: string;
    inputDataHash: string;
    configHash: string;
    estimatedDuration: number;
    totalCost: string;
    priority: number;
    isPrivate: boolean;
    metadata: string;
  }): Promise<{ success: boolean; jobId?: string; txHash?: string; error?: string }> {
    try {
      const user = authService.getUser();
      const userWallet = user?.walletAddress;

      if (!userWallet) {
        return {
          success: false,
          error: 'Wallet not connected. Please connect your wallet to create jobs.'
        };
      }

      console.log(`💼 Creating job on blockchain for client: ${userWallet}`);

      // Submit job to blockchain via jobs ledger
      const result = await jobsLedgerService.submitJob(
        userWallet,
        jobData.jobType,
        jobData.description,
        jobData.inputDataHash,
        jobData.configHash,
        jobData.estimatedDuration,
        jobData.totalCost,
        jobData.priority,
        jobData.isPrivate,
        jobData.metadata
      );

      if (result.success) {
        console.log(`✅ Job created successfully! JobID: ${result.jobId}`);
        
        // Optionally save to MongoDB for faster queries (caching)
        await this.cacheJobInMongoDB(result.jobId!.toString(), jobData, userWallet);
      }

      return {
        success: result.success,
        jobId: result.jobId?.toString(),
        error: result.error
      };
    } catch (error) {
      console.error('Error saving job to blockchain:', error);
      return {
        success: false,
        error: 'Failed to create job on blockchain'
      };
    }
  }

  /**
   * Register compute node on blockchain
   */
  async registerNodeOnBlockchain(nodeData: {
    nodeType: string;
    cpuCores: number;
    memoryGB: number;
    gpuCount: number;
    gpuType: string;
    pricePerHour: string;
    endpoint: string;
  }): Promise<{ success: boolean; nodeId?: string; txHash?: string; error?: string }> {
    try {
      const user = authService.getUser();
      const userWallet = user?.walletAddress;

      if (!userWallet) {
        return {
          success: false,
          error: 'Wallet not connected. Please connect your wallet to register nodes.'
        };
      }

      console.log(`🖥️ Registering compute node on blockchain for provider: ${userWallet}`);

      // Register node via blockchain service
      const result = await blockchainService.registerNode(
        nodeData.nodeType,
        nodeData.cpuCores,
        nodeData.memoryGB,
        nodeData.gpuCount,
        nodeData.gpuType,
        nodeData.pricePerHour,
        nodeData.endpoint
      );

      if (result.success) {
        console.log(`✅ Node registered successfully! NodeID: ${result.nodeId}`);
        
        // Optionally cache in MongoDB for faster queries
        await this.cacheNodeInMongoDB(result.nodeId!.toString(), nodeData, userWallet);
      }

      return {
        success: result.success,
        nodeId: result.nodeId?.toString(),
        error: result.error
      };
    } catch (error) {
      console.error('Error registering node on blockchain:', error);
      return {
        success: false,
        error: 'Failed to register node on blockchain'
      };
    }
  }

  /**
   * Accept a job as a provider (update job phase to accepted)
   */
  async acceptJobOnBlockchain(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = authService.getUser();
      const userWallet = user?.walletAddress;

      if (!userWallet) {
        return {
          success: false,
          error: 'Wallet not connected. Please connect your wallet to accept jobs.'
        };
      }

      console.log(`🤝 Provider ${userWallet} accepting job ${jobId} on blockchain`);

      // For now, we update the job phase to "Assigned" since there's no direct acceptJob method
      const result = await jobsLedgerService.updateJobPhase(parseInt(jobId), 2); // Phase 2 = Assigned

      if (result.success) {
        console.log(`✅ Job accepted successfully!`);
      }

      return result;
    } catch (error) {
      console.error('Error accepting job on blockchain:', error);
      return {
        success: false,
        error: 'Failed to accept job on blockchain'
      };
    }
  }

  /**
   * Verify that we can connect to blockchain with the wallet
   */
  private async verifyBlockchainConnection(walletAddress: string): Promise<boolean> {
    try {
      // Try to get token balance as a simple connectivity test
      await blockchainService.getTokenBalance(walletAddress);
      return true;
    } catch (error) {
      console.error('Blockchain connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Validate Ethereum address format
   */
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Calculate total transactions from job arrays
   */
  private calculateTotalTransactions(clientJobs: any[], providerJobs: any[]): number {
    return clientJobs.length + providerJobs.length;
  }

  /**
   * Cache job data in MongoDB for faster queries (optional optimization)
   */
  private async cacheJobInMongoDB(jobId: string, jobData: any, clientWallet: string): Promise<void> {
    try {
      // Send to backend for caching (implement this endpoint in backend if needed)
      const response = await fetch('http://localhost:5000/api/cache/job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({
          jobId,
          clientWallet,
          ...jobData,
          cachedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('Failed to cache job in MongoDB');
      }
    } catch (error) {
      console.warn('Error caching job in MongoDB:', error);
    }
  }

  /**
   * Cache node data in MongoDB for faster queries (optional optimization)
   */
  private async cacheNodeInMongoDB(nodeId: string, nodeData: any, providerWallet: string): Promise<void> {
    try {
      // Send to backend for caching (implement this endpoint in backend if needed)
      const response = await fetch('http://localhost:5000/api/cache/node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({
          nodeId,
          providerWallet,
          ...nodeData,
          cachedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('Failed to cache node in MongoDB');
      }
    } catch (error) {
      console.warn('Error caching node in MongoDB:', error);
    }
  }

  /**
   * Get current wallet link status
   */
  async getWalletLinkStatus(): Promise<WalletLinkStatus> {
    const user = authService.getUser();
    
    if (!user) {
      return { isLinked: false, error: 'User not authenticated' };
    }

    if (!user.walletAddress) {
      return { isLinked: false, error: 'Wallet not connected' };
    }

    const blockchainConnected = await this.verifyBlockchainConnection(user.walletAddress);

    return {
      isLinked: true,
      walletAddress: user.walletAddress,
      blockchainDataAvailable: blockchainConnected
    };
  }
}

export default new WalletIntegrationService();
