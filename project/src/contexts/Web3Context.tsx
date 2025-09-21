import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import blockchainService, { NodeInfo, JobInfo, TokenBalance } from '../services/blockchainService';
import WalletStateManager from '../utils/WalletStateManager';

interface Web3ContextType {
  isConnected: boolean;
  userAddress: string;
  balance: TokenBalance | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  availableNodes: NodeInfo[];
  userJobs: JobInfo[];
  createJob: (nodeId: number, duration: number, jobType: string, jobConfig: string) => Promise<boolean>;
  registerNode: (nodeType: string, cpuCores: number, memoryGB: number, gpuCount: number, gpuType: string, pricePerHour: string, endpoint: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [availableNodes, setAvailableNodes] = useState<NodeInfo[]>([]);
  const [userJobs, setUserJobs] = useState<JobInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const walletManager = WalletStateManager.getInstance();

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          console.log('Wallet disconnected by user');
          disconnectWallet();
        } else if (accounts[0] !== userAddress) {
          // User switched accounts
          const newAddress = accounts[0];
          console.log('Account changed to:', newAddress);
          setUserAddress(newAddress);
          
          // Update wallet manager
          if (window.ethereum) {
            window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
              walletManager.setConnected(newAddress, parseInt(chainId, 16));
            });
          }
          
          if (isConnected) {
            refreshUserData(newAddress);
          }
        }
      };

      const handleChainChanged = (chainId: string) => {
        console.log('Chain changed to:', chainId);
        // Update wallet manager with new chain
        if (userAddress) {
          walletManager.setConnected(userAddress, parseInt(chainId, 16));
        }
        // Refresh data for new chain
        refreshData();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [userAddress, isConnected]);

    const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await blockchainService.connectWallet();
      
      if (result.success && result.address) {
        setIsConnected(true);
        setUserAddress(result.address);
        
        // Get chain ID and save to wallet manager
        const chainId = await window.ethereum?.request({ method: 'eth_chainId' });
        walletManager.setConnected(result.address, parseInt(chainId, 16));
        
        console.log('Wallet connected and state saved:', result.address);
        
        // Refresh data after connection
        await refreshUserData(result.address);
      } else {
        setError(result.error || 'Failed to connect wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setUserAddress('');
    setBalance(null);
    setUserJobs([]);
    
    // Clear wallet manager state
    walletManager.setDisconnected();
    console.log('Wallet disconnected and state cleared');
  }, []);

  const refreshUserData = useCallback(async (address?: string) => {
    const targetAddress = address || userAddress;
    if (!targetAddress) return;

    setLoading(true);
    try {
      // Fetch user data in parallel
      const [balanceData, jobsData] = await Promise.all([
        blockchainService.getTokenBalance(targetAddress),
        blockchainService.getUserJobs(targetAddress),
      ]);

      setBalance(balanceData);
      setUserJobs(jobsData);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh user data');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch available nodes
      const nodes = await blockchainService.getAvailableNodes();
      setAvailableNodes(nodes);

      // Refresh user data if connected
      if (isConnected && userAddress) {
        await refreshUserData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [isConnected, userAddress]);

  const createJob = useCallback(async (
    nodeId: number,
    duration: number,
    jobType: string,
    jobConfig: string
  ): Promise<boolean> => {
    if (!isConnected) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await blockchainService.createJob(nodeId, duration, jobType, jobConfig);
      
      if (result.success) {
        // Refresh user jobs to show the new job
        await refreshUserData();
        return true;
      } else {
        setError(result.error || 'Failed to create job');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, refreshUserData]);

  const registerNode = useCallback(async (
    nodeType: string,
    cpuCores: number,
    memoryGB: number,
    gpuCount: number,
    gpuType: string,
    pricePerHour: string,
    endpoint: string
  ): Promise<boolean> => {
    if (!isConnected) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await blockchainService.registerNode(
        nodeType,
        cpuCores,
        memoryGB,
        gpuCount,
        gpuType,
        pricePerHour,
        endpoint
      );
      
      if (result.success) {
        // Refresh available nodes to show the new node
        await refreshData();
        return true;
      } else {
        setError(result.error || 'Failed to register node');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register node');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, refreshData]);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      const savedState = walletManager.getState();
      
      if (savedState && savedState.isConnected) {
        console.log('Checking saved wallet connection:', savedState.address);
        
        const isValid = await walletManager.validateConnection();
        if (isValid) {
          console.log('Restoring wallet connection:', savedState.address);
          setIsConnected(true);
          setUserAddress(savedState.address);
          await refreshUserData(savedState.address);
        } else {
          console.log('Saved wallet connection is no longer valid');
        }
      }
    };

    checkExistingConnection();
  }, []);

  // Load available nodes on mount and check connection on focus
  useEffect(() => {
    refreshData();
    
    // Check wallet connection when window regains focus
    const handleFocus = async () => {
      const savedState = walletManager.getState();
      if (savedState && savedState.isConnected) {
        const isValid = await walletManager.validateConnection();
        if (!isValid && isConnected) {
          console.log('Wallet disconnected while away - updating state');
          setIsConnected(false);
          setUserAddress('');
          setBalance(null);
          setUserJobs([]);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected]);

  // Set up blockchain event listeners (with error handling for filters)
  useEffect(() => {
    if (!isConnected) return;

    let eventCleanup: (() => void) | null = null;

    const setupEventListeners = async () => {
      try {
        const handleJobCreated = (_jobId: number, client: string, _nodeId: number) => {
          if (client.toLowerCase() === userAddress.toLowerCase()) {
            // Refresh user jobs when user creates a job
            refreshUserData();
          }
          // Refresh available nodes (one might become unavailable)
          refreshData();
        };

        const handleJobCompleted = (_jobId: number, _endTime: number) => {
          // Refresh both user jobs and available nodes
          refreshUserData();
          refreshData();
        };

        // Use polling instead of filters to avoid filter errors
        const pollInterval = setInterval(() => {
          // Silently refresh data every 30 seconds instead of using event filters
          if (isConnected) {
            refreshData().catch(err => console.log('Background refresh error:', err));
            if (userAddress) {
              refreshUserData().catch(err => console.log('Background user refresh error:', err));
            }
          }
        }, 30000);

        eventCleanup = () => {
          clearInterval(pollInterval);
        };

        // Try to set up event listeners, but fallback to polling if they fail
        try {
          blockchainService.onJobCreated(handleJobCreated);
          blockchainService.onJobCompleted(handleJobCompleted);
        } catch (filterError) {
          console.log('Event filters not available, using polling instead');
        }

      } catch (error) {
        console.log('Event listener setup failed, using polling instead:', error);
      }
    };

    setupEventListeners();

    // Cleanup on unmount
    return () => {
      if (eventCleanup) {
        eventCleanup();
      }
    };
  }, [isConnected, userAddress]);

  const value: Web3ContextType = {
    isConnected,
    userAddress,
    balance,
    connectWallet,
    disconnectWallet,
    availableNodes,
    userJobs,
    createJob,
    registerNode,
    refreshData,
    loading,
    error,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider;
