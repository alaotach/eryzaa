import React from 'react';

const SmartContracts: React.FC = () => {
  const contracts = [
    {
      name: 'ERYZA Token',
      address: import.meta.env.VITE_ERYZA_TOKEN_ADDRESS,
      description: 'ERC-20 token used for payments and staking in the Eryza ecosystem',
      features: ['Transfer tokens', 'Approve spending', 'Check balances', 'Mint/Burn (admin)']
    },
    {
      name: 'Compute Marketplace',
      address: import.meta.env.VITE_MARKETPLACE_ADDRESS,
      description: 'Main marketplace contract for compute job management',
      features: ['Register nodes', 'Submit jobs', 'Assign jobs', 'Handle payments']
    },
    {
      name: 'Jobs Ledger',
      address: import.meta.env.VITE_JOBS_LEDGER_ADDRESS,
      description: 'Comprehensive job tracking and analytics system',
      features: ['Track job lifecycle', 'Record metrics', 'Quality scoring', 'Analytics dashboard']
    },
    {
      name: 'Staking Contract',
      address: import.meta.env.VITE_STAKING_ADDRESS,
      description: 'Token staking for network security and governance',
      features: ['Stake tokens', 'Earn rewards', 'Voting power', 'Slashing protection']
    }
  ];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Smart Contract Conditions</h1>

        {/* Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contract Overview</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The Eryza platform consists of several smart contracts deployed on the Avalanche Fuji testnet. 
            Each contract serves a specific purpose in the decentralized compute marketplace ecosystem.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>Network:</strong> Avalanche Fuji Testnet (Chain ID: 43113)
            </p>
          </div>
        </div>

        {/* Contract Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {contracts.map((contract, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{contract.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{contract.description}</p>
              
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contract Address</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1 break-all">
                  {contract.address || 'Not deployed'}
                </p>
                {contract.address && (
                  <a 
                    href={`https://testnet.snowtrace.io/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-xs mt-1 inline-block"
                  >
                    View on Snowtrace →
                  </a>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Features</label>
                <ul className="mt-2 space-y-1">
                  {contract.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                      <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Contract Interactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contract Interactions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Job Lifecycle</h3>
              <div className="flex flex-wrap gap-2">
                {['Submitted', 'Funded', 'Assigned', 'Running', 'Validating', 'Completed'].map((phase, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    {index + 1}. {phase}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Payment Flow</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>1. Client approves ERYZA token spending to marketplace contract</p>
                <p>2. Client submits job with payment escrow</p>
                <p>3. Job is assigned to provider and execution begins</p>
                <p>4. Upon completion, payment is released to provider</p>
                <p>5. Quality scores and reputation are updated</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Security Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Access Control</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <li>• Owner-only functions</li>
                    <li>• Role-based permissions</li>
                    <li>• Multi-signature requirements</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Safety Mechanisms</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <li>• Reentrancy protection</li>
                    <li>• Integer overflow protection</li>
                    <li>• Emergency pause functionality</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Technical Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Blockchain Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Network</span>
                  <span className="text-gray-900 dark:text-white">Avalanche Fuji</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Chain ID</span>
                  <span className="text-gray-900 dark:text-white">43113</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Block Time</span>
                  <span className="text-gray-900 dark:text-white">~2 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Gas Token</span>
                  <span className="text-gray-900 dark:text-white">AVAX</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Smart Contract Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Solidity Version</span>
                  <span className="text-gray-900 dark:text-white">^0.8.19</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">OpenZeppelin</span>
                  <span className="text-gray-900 dark:text-white">v5.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">License</span>
                  <span className="text-gray-900 dark:text-white">MIT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Upgradeable</span>
                  <span className="text-gray-900 dark:text-white">No</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartContracts;
