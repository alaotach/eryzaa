import { ethers } from 'ethers';

// Avalanche Fuji Testnet configuration
const AVALANCHE_FUJI_CONFIG = {
  chainId: '0xa869', // 43113 in decimal
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
};

// Use zero address as safe placeholder to avoid ENS lookups on non-ENS chains
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
// Contract addresses (set via Vite env at build time)
const CONTRACT_ADDRESSES = {
  ERYZA_TOKEN: import.meta.env.VITE_ERYZA_TOKEN_ADDRESS || ZERO_ADDRESS,
  COMPUTE_MARKETPLACE: import.meta.env.VITE_MARKETPLACE_ADDRESS || ZERO_ADDRESS,
  STAKING: import.meta.env.VITE_STAKING_ADDRESS || ZERO_ADDRESS,
};

// Debug logging for contract addresses
console.log('🔍 Contract addresses loaded:', CONTRACT_ADDRESSES);
console.log('🔍 Environment variables:', {
  VITE_ERYZA_TOKEN_ADDRESS: import.meta.env.VITE_ERYZA_TOKEN_ADDRESS,
  VITE_MARKETPLACE_ADDRESS: import.meta.env.VITE_MARKETPLACE_ADDRESS,
  VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
});

// Contract ABIs (simplified versions)
const ERYZA_TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

const MARKETPLACE_ABI = [
  'function registerComputeNode(string nodeType, uint256 cpuCores, uint256 memoryGB, uint256 gpuCount, string gpuType, uint256 pricePerHour, string endpoint) returns (uint256)',
  'function createComputeJob(uint256 nodeId, uint256 duration, string jobType, string jobConfig) returns (uint256)',
  'function startComputeJob(uint256 jobId)',
  'function completeComputeJob(uint256 jobId)',
  'function getAvailableNodes(string nodeType) view returns (uint256[])',
  'function getNodeInfo(uint256 nodeId) view returns (tuple(address provider, string nodeType, uint256 cpuCores, uint256 memoryGB, uint256 gpuCount, string gpuType, uint256 pricePerHour, bool available, uint256 totalJobs, uint256 successfulJobs, string endpoint))',
  'function getJobInfo(uint256 jobId) view returns (tuple(uint256 nodeId, address client, address provider, uint256 duration, uint256 totalCost, uint256 startTime, uint256 endTime, uint8 status, string jobType, string jobConfig, bool disputed, address disputer, string disputeReason))',
  'function getProviderNodes(address provider) view returns (uint256[])',
  'function getClientJobs(address client) view returns (uint256[])',
  'event ComputeNodeRegistered(address indexed provider, uint256 indexed nodeId, uint256 pricePerHour)',
  'event ComputeJobCreated(uint256 indexed jobId, address indexed client, uint256 indexed nodeId, uint256 duration)',
  'event ComputeJobStarted(uint256 indexed jobId, uint256 startTime)',
  'event ComputeJobCompleted(uint256 indexed jobId, uint256 endTime)',
];

interface NodeInfo {
  id: number;
  provider: string;
  nodeType: string;
  cpuCores: number;
  memoryGB: number;
  gpuCount: number;
  gpuType: string;
  pricePerHour: string;
  available: boolean;
  totalJobs: number;
  successfulJobs: number;
  endpoint: string;
}

interface JobInfo {
  id: number;
  nodeId: number;
  client: string;
  provider: string;
  duration: number;
  totalCost: string;
  startTime: number;
  endTime: number;
  status: number;
  jobType: string;
  jobConfig: string;
  disputed: boolean;
  disputer: string;
  disputeReason: string;
}

interface TokenBalance {
  balance: string;
  decimals: number;
  symbol: string;
  name: string;
}

export class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private eryzaToken: ethers.Contract | null = null;
  private marketplace: ethers.Contract | null = null;
  private connected = false;
  private userAddress = '';

  constructor() {
    this.initializeReadOnlyProvider();
  }

  private isValidAddress(addr: string | undefined): addr is string {
    try {
      return !!addr && ethers.isAddress(addr) && addr !== ZERO_ADDRESS;
    } catch {
      return false;
    }
  }

  private initContracts(readable: ethers.Provider | ethers.Signer) {
    // Only initialize contracts when addresses are valid; otherwise keep null to avoid ENS resolution attempts
    console.log('🔧 Initializing contracts with addresses:', CONTRACT_ADDRESSES);
    
    this.eryzaToken = this.isValidAddress(CONTRACT_ADDRESSES.ERYZA_TOKEN)
      ? new ethers.Contract(CONTRACT_ADDRESSES.ERYZA_TOKEN, ERYZA_TOKEN_ABI, readable)
      : null;
    this.marketplace = this.isValidAddress(CONTRACT_ADDRESSES.COMPUTE_MARKETPLACE)
      ? new ethers.Contract(CONTRACT_ADDRESSES.COMPUTE_MARKETPLACE, MARKETPLACE_ABI, readable)
      : null;
      
    console.log('✅ Contracts initialized:', {
      eryzaToken: !!this.eryzaToken,
      marketplace: !!this.marketplace,
      eryzaTokenAddress: this.eryzaToken?.target,
      marketplaceAddress: this.marketplace?.target
    });
  }

  // Initialize read-only provider for viewing data without wallet connection
  private initializeReadOnlyProvider() {
    try {
  // Explicit network avoids provider guessing and any ENS auto-resolution paths
  const network = { name: 'avalanche-fuji', chainId: 43113 };
  const readOnlyProvider = new ethers.JsonRpcProvider(AVALANCHE_FUJI_CONFIG.rpcUrls[0], network);
  this.initContracts(readOnlyProvider);
    } catch (error) {
      console.error('Failed to initialize read-only provider:', error);
    }
  }

  // Connect to MetaMask wallet
  async connectWallet(): Promise<{ success: boolean; address?: string; error?: string }> {
    try {
      console.log('🔗 Attempting to connect wallet...');
      
      if (!window.ethereum) {
        console.error('❌ MetaMask not installed');
        return { success: false, error: 'MetaMask not installed' };
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Initialize provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();

      console.log('🎉 Wallet connected:', this.userAddress);

      // Initialize contracts with signer for transactions (only if addresses are valid)
      this.initContracts(this.signer);

      // Add/Switch to Avalanche Fuji network
      try {
        console.log('🔀 Switching to Avalanche Fuji network...');
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: AVALANCHE_FUJI_CONFIG.chainId }],
        });
        console.log('✅ Network switched successfully');
      } catch (switchError: any) {
        // Network doesn't exist, add it
        if (switchError.code === 4902) {
          console.log('➕ Adding Avalanche Fuji network...');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [AVALANCHE_FUJI_CONFIG],
          });
          console.log('✅ Network added successfully');
        } else {
          console.error('❌ Network switch error:', switchError);
        }
      }

      this.connected = true;
      return { success: true, address: this.userAddress };
    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's token balance
  async getTokenBalance(address?: string): Promise<TokenBalance | null> {
    try {
      if (!this.eryzaToken) return null;
      
      const targetAddress = address || this.userAddress;
      if (!targetAddress) return null;

      const [balance, decimals, symbol, name] = await Promise.all([
        this.eryzaToken.balanceOf(targetAddress),
        this.eryzaToken.decimals(),
        this.eryzaToken.symbol(),
        this.eryzaToken.name(),
      ]);

      return {
        balance: ethers.formatUnits(balance, decimals),
        decimals,
        symbol,
        name,
      };
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return null;
    }
  }

  // Get all available compute nodes
  async getAvailableNodes(nodeType: string = ''): Promise<NodeInfo[]> {
    try {
      if (!this.marketplace) {
        console.warn('Marketplace contract not initialized');
        return [];
      }

      let nodeIds: bigint[];
      if (nodeType) {
        nodeIds = await this.marketplace.getAvailableNodes(nodeType);
      } else {
        // Get all nodes by checking different types
        const types = ['ssh', 'training', 'edge', 'inference'];
        const allNodes = await Promise.all(
          types.map(type => this.marketplace!.getAvailableNodes(type))
        );
        nodeIds = allNodes.flat();
      }

      if (!nodeIds || nodeIds.length === 0) {
        console.log('No nodes available from contracts');
        return [];
      }

      // Get detailed info for each node
      const nodeInfos = await Promise.all(
        nodeIds.map(async (nodeId) => {
          try {
            const info = await this.marketplace!.getNodeInfo(nodeId);
            return {
              id: Number(nodeId),
              provider: info.provider,
              nodeType: info.nodeType,
              cpuCores: Number(info.cpuCores),
              memoryGB: Number(info.memoryGB),
              gpuCount: Number(info.gpuCount),
              gpuType: info.gpuType,
              pricePerHour: ethers.formatEther(info.pricePerHour),
              available: info.available,
              totalJobs: Number(info.totalJobs),
              successfulJobs: Number(info.successfulJobs),
              endpoint: info.endpoint,
            };
          } catch (error) {
            console.error(`Error fetching node ${nodeId} info:`, error);
            return null;
          }
        })
      );

      const validNodes = nodeInfos.filter((node): node is NodeInfo => node !== null && node.available);
      return validNodes;
    } catch (error) {
      console.error('Error fetching available nodes:', error);
      return [];
    }
  }

  // Get user's active jobs
  getUserJobs = async (address?: string): Promise<JobInfo[]> => {
    try {
      if (!this.marketplace) return [];
      
      const targetAddress = address || this.userAddress;
      if (!targetAddress) return [];

      const jobIds = await this.marketplace.getClientJobs(targetAddress);
      
      // Get detailed info for each job
      const jobInfos = await Promise.all(
        jobIds.map(async (jobId: bigint) => {
          const info = await this.marketplace!.getJobInfo(jobId);
          return {
            id: Number(jobId),
            nodeId: Number(info.nodeId),
            client: info.client,
            provider: info.provider,
            duration: Number(info.duration),
            totalCost: ethers.formatEther(info.totalCost),
            startTime: Number(info.startTime),
            endTime: Number(info.endTime),
            status: Number(info.status),
            jobType: info.jobType,
            jobConfig: info.jobConfig,
            disputed: info.disputed,
            disputer: info.disputer,
            disputeReason: info.disputeReason,
          };
        })
      );

      return jobInfos;
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      return [];
    }
  }

  // Create a new compute job
  async createJob(
    nodeId: number,
    duration: number,
    jobType: string,
    jobConfig: string
  ): Promise<{ success: boolean; jobId?: number; error?: string }> {
    try {
      if (!this.marketplace || !this.connected) {
        return { success: false, error: 'Wallet not connected' };
      }

      // Get node info to calculate cost
      const nodeInfo = await this.marketplace.getNodeInfo(nodeId);
      const totalCost = BigInt(nodeInfo.pricePerHour) * BigInt(duration);
      const platformFee = (totalCost * 250n) / 10000n; // 2.5% fee
      const totalAmount = totalCost + platformFee;

      // Check and approve token allowance
      const currentAllowance = await this.eryzaToken!.allowance(this.userAddress, CONTRACT_ADDRESSES.COMPUTE_MARKETPLACE);
      if (currentAllowance < totalAmount) {
        console.log('Approving tokens...');
        const approveTx = await this.eryzaToken!.approve(CONTRACT_ADDRESSES.COMPUTE_MARKETPLACE, totalAmount);
        await approveTx.wait();
      }

      // Create the job
      console.log('Creating job...');
      const tx = await this.marketplace.createComputeJob(nodeId, duration, jobType, jobConfig);
      const receipt = await tx.wait();

      // Extract job ID from events
      const jobCreatedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('ComputeJobCreated(uint256,address,uint256,uint256)')
      );
      
      if (jobCreatedEvent) {
        const jobId = Number(jobCreatedEvent.topics[1]);
        return { success: true, jobId };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error creating job:', error);
      return { success: false, error: error.message };
    }
  }

  // Register a compute node
  async registerNode(
    nodeType: string,
    cpuCores: number,
    memoryGB: number,
    gpuCount: number,
    gpuType: string,
    pricePerHour: string,
    endpoint: string
  ): Promise<{ success: boolean; nodeId?: number; error?: string }> {
    try {
      if (!this.marketplace || !this.connected) {
        return { success: false, error: 'Wallet not connected' };
      }

      const priceInWei = ethers.parseEther(pricePerHour);
      
      const tx = await this.marketplace.registerComputeNode(
        nodeType,
        cpuCores,
        memoryGB,
        gpuCount,
        gpuType,
        priceInWei,
        endpoint
      );
      
      const receipt = await tx.wait();
      
      // Extract node ID from events
      const nodeRegisteredEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('ComputeNodeRegistered(address,uint256,uint256)')
      );
      
      if (nodeRegisteredEvent) {
        const nodeId = Number(nodeRegisteredEvent.topics[2]);
        return { success: true, nodeId };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error registering node:', error);
      return { success: false, error: error.message };
    }
  }

  // Get provider's nodes
  async getProviderNodes(address?: string): Promise<NodeInfo[]> {
    try {
      if (!this.marketplace) return [];
      
      const targetAddress = address || this.userAddress;
      if (!targetAddress) return [];

      const nodeIds = await this.marketplace.getProviderNodes(targetAddress);
      
      // Get detailed info for each node
      const nodeInfos = await Promise.all(
        nodeIds.map(async (nodeId: bigint) => {
          const info = await this.marketplace!.getNodeInfo(nodeId);
          return {
            id: Number(nodeId),
            provider: info.provider,
            nodeType: info.nodeType,
            cpuCores: Number(info.cpuCores),
            memoryGB: Number(info.memoryGB),
            gpuCount: Number(info.gpuCount),
            gpuType: info.gpuType,
            pricePerHour: ethers.formatEther(info.pricePerHour),
            available: info.available,
            totalJobs: Number(info.totalJobs),
            successfulJobs: Number(info.successfulJobs),
            endpoint: info.endpoint,
          };
        })
      );

      return nodeInfos;
    } catch (error) {
      console.error('Error fetching provider nodes:', error);
      return [];
    }
  }

  // Listen to marketplace events
  onJobCreated(callback: (jobId: number, client: string, nodeId: number) => void) {
    if (!this.marketplace) return;

    this.marketplace.on('ComputeJobCreated', (jobId: any, client: any, nodeId: any, _duration: any, _event: any) => {
      callback(Number(jobId), client, Number(nodeId));
    });
  }

  onJobStarted(callback: (jobId: number, startTime: number) => void) {
    if (!this.marketplace) return;

    this.marketplace.on('ComputeJobStarted', (jobId: any, startTime: any, _event: any) => {
      callback(Number(jobId), Number(startTime));
    });
  }

  onJobCompleted(callback: (jobId: number, endTime: number) => void) {
    if (!this.marketplace) return;

    this.marketplace.on('ComputeJobCompleted', (jobId: any, endTime: any, _event: any) => {
      callback(Number(jobId), Number(endTime));
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.connected;
  }

  getUserAddress(): string {
    return this.userAddress;
  }

  // Format utilities
  formatJobStatus(status: number): string {
    const statuses = ['Created', 'Funded', 'Started', 'Completed', 'Cancelled', 'Disputed'];
    return statuses[status] || 'Unknown';
  }

  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${hours} hours`;
    } else {
      return `${Math.round(hours / 24)} days`;
    }
  }

  formatPrice(priceInAvax: string): string {
    const price = parseFloat(priceInAvax);
    if (price < 0.001) {
      return `${(price * 1000).toFixed(3)} mAVAX`;
    }
    return `${price.toFixed(4)} AVAX`;
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;

// Export types
export type { NodeInfo, JobInfo, TokenBalance };