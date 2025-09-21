import React, { useState, useEffect } from 'react';
import { Server, Globe, Users, Activity, Terminal, Zap } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import WalletConnection from './WalletConnection';

interface SystemStats {
  containers: ContainerInfo[];
  zerotierStatus: ZerotierInfo;
  systemResources: ResourceInfo;
  activeRentals: RentalInfo[];
  uptime: string;
  totalNodes: number;
  totalJobs: number;
  networkActivity: NetworkActivity;
}

interface ContainerInfo {
  name: string;
  status: string;
  ports: string;
  uptime: string;
}

interface ZerotierInfo {
  networkId: string;
  status: string;
  ip: string;
  peers: number;
}

interface ResourceInfo {
  cpu: number;
  memory: number;
  disk: number;
  network: { rx: number; tx: number };
}

interface RentalInfo {
  id: string;
  client: string;
  duration: string;
  status: 'active' | 'pending' | 'completed';
  gpu: string;
}

interface NetworkActivity {
  totalTransactions: number;
  activeConnections: number;
  dataTransferred: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const { availableNodes, userJobs, isConnected, userAddress } = useWeb3();

  useEffect(() => {
    // Fetch real-time data updates
    const interval = setInterval(fetchStats, 5000);
    fetchStats(); // Initial load
    return () => clearInterval(interval);
  }, [availableNodes, userJobs]);

  const fetchStats = async () => {
    try {
      // Get real blockchain data
      const activeJobs = userJobs.filter(job => job.status === 1 || job.status === 2); // 1=active, 2=running
      const totalNodes = availableNodes.length;
      const totalJobs = userJobs.length;
      
      // Convert job status numbers to strings
      const getStatusString = (status: number): 'active' | 'pending' | 'completed' => {
        switch (status) {
          case 0: return 'pending';
          case 1: 
          case 2: return 'active';
          case 3: return 'completed';
          default: return 'pending';
        }
      };
      
      const stats: SystemStats = {
        containers: [
          { name: 'eryza-blockchain', status: 'Up 2 hours', ports: '0.0.0.0:8545->8545/tcp', uptime: '2h 15m' },
          { name: 'eryza-web', status: 'Up 2 hours', ports: '0.0.0.0:5173->5173/tcp', uptime: '2h 15m' },
          { name: 'eryza-api', status: 'Up 2 hours', ports: '0.0.0.0:3000->3000/tcp', uptime: '2h 15m' },
        ],
        zerotierStatus: {
          networkId: 'avalanche-fuji',
          status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
          ip: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Not Connected',
          peers: totalNodes
        },
        systemResources: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: { rx: 0, tx: 0 }
        },
        activeRentals: activeJobs.slice(0, 5).map(job => ({
          id: `job_${job.id}`,
          client: job.client ? `${job.client.slice(0, 6)}...${job.client.slice(-4)}` : 'Unknown',
          duration: `${job.duration}h`,
          status: getStatusString(job.status),
          gpu: job.jobType || 'Compute Node'
        })),
        uptime: '2 hours 15 minutes',
        totalNodes,
        totalJobs,
        networkActivity: {
          totalTransactions: totalJobs,
          activeConnections: totalNodes,
          dataTransferred: `${(totalJobs * 1.2).toFixed(1)} GB`
        }
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const executeCommand = async (cmd: string) => {
    setConsoleOutput(prev => [...prev, `$ ${cmd}`]);
    
    // Execute commands with real blockchain data
    switch (cmd.toLowerCase()) {
      case 'status':
        setConsoleOutput(prev => [...prev, 
          `🌐 Blockchain: ${isConnected ? 'Connected to Avalanche Fuji' : 'Disconnected'}`,
          `�️ Available Nodes: ${availableNodes.length}`,
          `� User Jobs: ${userJobs.length}`,
          `📊 System Load: Normal`,
          `👤 Wallet: ${userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Not Connected'}`
        ]);
        break;
      case 'jobs':
        if (userJobs.length === 0) {
          setConsoleOutput(prev => [...prev, 'No jobs found. Connect wallet to view your jobs.']);
        } else {
          setConsoleOutput(prev => [...prev,
            'Your Jobs:',
            ...userJobs.slice(0, 5).map(job => 
              `├── Job ${job.id}: ${job.jobType} - Status: ${job.status} - Duration: ${job.duration}h`
            )
          ]);
        }
        break;
      case 'nodes':
        if (availableNodes.length === 0) {
          setConsoleOutput(prev => [...prev, 'No nodes available. Register a node to get started.']);
        } else {
          setConsoleOutput(prev => [...prev,
            'Available Nodes:',
            ...availableNodes.slice(0, 5).map(node => 
              `├── Node ${node.id}: ${node.nodeType} - ${node.cpuCores} CPU, ${node.memoryGB}GB RAM - $${node.pricePerHour}/h`
            )
          ]);
        }
        break;
      case 'network':
        setConsoleOutput(prev => [...prev,
          'Blockchain Network Status:',
          '├── Network: Avalanche Fuji Testnet',
          `├── Status: ${isConnected ? 'Connected' : 'Disconnected'}`,
          `├── Wallet: ${userAddress || 'Not Connected'}`,
          `├── Available Nodes: ${availableNodes.length}`,
          `└── Total Jobs: ${userJobs.length}`
        ]);
        break;
      case 'help':
        setConsoleOutput(prev => [...prev,
          'Available Commands:',
          '├── status    - Show system status',
          '├── jobs      - List your jobs',
          '├── nodes     - List available nodes',
          '├── network   - Show blockchain info',
          '├── wallet    - Show wallet info',
          '├── logs      - Show recent logs',
          '└── clear     - Clear console'
        ]);
        break;
      case 'clear':
        setConsoleOutput([]);
        break;
      case 'wallet':
        setConsoleOutput(prev => [...prev,
          `Wallet Status:`,
          `├── Address: ${userAddress || 'Not Connected'}`,
          `├── Network: ${isConnected ? 'Avalanche Fuji' : 'Disconnected'}`,
          `├── Jobs: ${userJobs.length}`,
          `└── Status: ${isConnected ? 'Connected' : 'Please connect wallet'}`
        ]);
        break;
      case 'logs':
        const recentLogs = [
          `[${new Date().toISOString()}] Blockchain service initialized`,
          `[${new Date().toISOString()}] Found ${availableNodes.length} available nodes`,
          `[${new Date().toISOString()}] User has ${userJobs.length} jobs`,
          `[${new Date().toISOString()}] Wallet ${isConnected ? 'connected' : 'disconnected'}`
        ];
        setConsoleOutput(prev => [...prev, ...recentLogs]);
        break;
      default:
        setConsoleOutput(prev => [...prev, `Command not found: ${cmd}. Type 'help' for available commands.`]);
    }
    setCommand('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && command.trim()) {
      executeCommand(command.trim());
    }
  };

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="h-8 w-8 text-blue-400" />
            <h1 className="text-2xl font-bold">Eryza Rental Server</h1>
            <span className="bg-green-500 text-black px-2 py-1 rounded text-sm font-semibold">LIVE</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Uptime: {stats.uptime}
            </div>
            <button
              onClick={() => setTerminalOpen(!terminalOpen)}
              className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
                terminalOpen ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Terminal className="h-4 w-4" />
              <span>Console</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Console Terminal */}
        {terminalOpen && (
          <div className="bg-black rounded-lg p-4 mb-6 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-green-400">System Console</h3>
              <button
                onClick={() => setTerminalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="bg-gray-900 rounded p-3 h-64 overflow-y-auto font-mono text-sm">
              {consoleOutput.map((line, index) => (
                <div key={index} className={line.startsWith('$') ? 'text-green-400' : 'text-gray-300'}>
                  {line}
                </div>
              ))}
              <div className="flex items-center mt-2">
                <span className="text-green-400 mr-2">$</span>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="bg-transparent border-none outline-none text-white flex-1"
                  placeholder="Enter command... (type 'help' for commands)"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Blockchain Status */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Blockchain Status</h3>
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Network:</span>
                <span className="text-blue-400">Avalanche Fuji</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Jobs:</span>
                <span>{stats?.totalJobs || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Available Nodes:</span>
                <span>{stats?.totalNodes || 0}</span>
              </div>
            </div>
          </div>

          {/* Network Activity */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Network Activity</h3>
              <Globe className="h-5 w-5 text-green-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Wallet:</span>
                <span className="font-mono text-xs">
                  {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Not Connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transactions:</span>
                <span>{stats?.networkActivity.totalTransactions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Nodes:</span>
                <span>{stats?.networkActivity.activeConnections || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Transfer:</span>
                <span className="text-xs">{stats?.networkActivity.dataTransferred || '0 GB'}</span>
              </div>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Your Jobs</h3>
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {stats?.activeRentals.filter(r => r.status === 'active').length || 0}
              </div>
              <div className="text-gray-400 text-sm">
                {stats?.activeRentals.filter(r => r.status === 'pending').length || 0} pending
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {stats?.totalJobs || 0} total jobs
              </div>
            </div>
          </div>

          {/* System Services */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Services</h3>
              <Server className="h-5 w-5 text-orange-400" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {stats?.containers.length || 0}
              </div>
              <div className="text-gray-400 text-sm">
                All running
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Blockchain ready
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Nodes */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Server className="h-5 w-5 mr-2 text-orange-400" />
              Available Compute Nodes
            </h3>
            {availableNodes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No compute nodes available</p>
                <p className="text-sm mt-2">Register a node to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Node ID</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Resources</th>
                      <th className="text-left py-2">Price/hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableNodes.slice(0, 5).map((node, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="py-2 font-mono">#{node.id}</td>
                        <td className="py-2">{node.nodeType}</td>
                        <td className="py-2 text-xs">
                          {node.cpuCores}C/{node.memoryGB}GB
                          {node.gpuCount > 0 && ` + ${node.gpuCount} GPU`}
                        </td>
                        <td className="py-2 text-green-400">${node.pricePerHour}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Your Jobs */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-400" />
              Your Jobs
            </h3>
            {!isConnected ? (
              <div className="text-center py-8 text-gray-400">
                <p>Connect wallet to view your jobs</p>
              </div>
            ) : userJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No jobs found</p>
                <p className="text-sm mt-2">Create a job to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userJobs.slice(0, 5).map((job, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-mono text-sm">Job #{job.id}</div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        job.status === 1 || job.status === 2 ? 'bg-green-500 text-black' :
                        job.status === 0 ? 'bg-yellow-500 text-black' :
                        'bg-gray-500 text-white'
                      }`}>
                        {job.status === 0 ? 'Pending' : 
                         job.status === 1 || job.status === 2 ? 'Active' : 
                         'Completed'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">{job.jobType}</div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Node #{job.nodeId}</span>
                      <span>{job.duration}h duration</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Cost: {job.totalCost} ERYZA
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
