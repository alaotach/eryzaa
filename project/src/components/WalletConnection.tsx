import React from 'react';
import { Wallet, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

const WalletConnection: React.FC = () => {
  const { 
    isConnected, 
    userAddress, 
    balance, 
    connectWallet, 
    disconnectWallet, 
    loading, 
    error 
  } = useWeb3();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: { balance: string; symbol: string } | null) => {
    if (!balance) return '0 ERYZA';
    const num = parseFloat(balance.balance);
    if (num < 0.0001) return `${(num * 1000000).toFixed(2)} μERYZA`;
    if (num < 0.1) return `${(num * 1000).toFixed(3)} mERYZA`;
    return `${num.toFixed(4)} ${balance.symbol}`;
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">Connecting...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-2">
        <button
          onClick={connectWallet}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
        </button>
        
        {error && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Connect to Avalanche Fuji testnet
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            Wallet Connected
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
        >
          Disconnect
        </button>
      </div>

      {/* Address and Balance */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Address:</span>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
              {formatAddress(userAddress)}
            </span>
            <button
              onClick={() => window.open(`https://testnet.snowtrace.io/address/${userAddress}`, '_blank')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Balance:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatBalance(balance)}
          </span>
        </div>
      </div>

      {/* Network Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        <div>Avalanche Fuji Testnet</div>
        <div className="flex items-center justify-center space-x-1 mt-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Connected</span>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;
