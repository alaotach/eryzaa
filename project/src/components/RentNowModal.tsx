import React, { useState } from 'react';
import { ethers, BrowserProvider, parseEther } from 'ethers';

interface RentNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: {
    node_id: string;
    ip_address: string;
    capabilities: {
      cpu_cores: string;
      memory_gb: string;
      gpu_count: string;
      gpu_type: string;
    };
    pricing: {
      per_hour: string;
      currency: string;
    };
    provider: string;
  };
}

const RentNowModal: React.FC<RentNowModalProps> = ({ isOpen, onClose, node }) => {
  const [duration, setDuration] = useState(1);
  const [description, setDescription] = useState('SSH Server Access');
  const [isRenting, setIsRenting] = useState(false);
  const [rentalResult, setRentalResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const totalCost = (parseFloat(node.pricing.per_hour) * duration).toFixed(4);

  const handleRentNow = async () => {
    try {
      setIsRenting(true);
      setError('');

      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask is required to rent nodes');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check if we're on the correct network (Avalanche Fuji Testnet)
      const network = await provider.getNetwork();
      const fujiChainId = 43113; // Avalanche Fuji testnet chain ID
      
      if (network.chainId !== BigInt(fujiChainId)) {
        console.log('Switching to Avalanche Fuji testnet...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa869' }], // 43113 in hex
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xa869',
                  chainName: 'Avalanche Fuji Testnet',
                  nativeCurrency: {
                    name: 'AVAX',
                    symbol: 'AVAX',
                    decimals: 18
                  },
                  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                  blockExplorerUrls: ['https://testnet.snowtrace.io/']
                }]
              });
            } catch (addError) {
              throw new Error('Failed to add Avalanche Fuji testnet to MetaMask');
            }
          } else {
            throw new Error('Failed to switch to Avalanche Fuji testnet');
          }
        }
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Calculate payment amount
      const paymentAmount = ethers.parseEther(totalCost);

      console.log('Sending payment transaction...');
      
      // Send payment to the node provider
      const paymentTx = await signer.sendTransaction({
        to: node.provider,
        value: paymentAmount,
        gasLimit: 21000
      });

      console.log('Payment transaction sent:', paymentTx.hash);
      
      // Wait for transaction confirmation
      const receipt = await paymentTx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }
      console.log('Payment confirmed:', receipt.hash);

      // Create rental job via API
      console.log('Creating rental job...');
      const response = await fetch('http://localhost:5000/api/rental/create-rental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: node.node_id,
          customerAddress: userAddress,
          durationHours: duration,
          description,
          paymentTxHash: receipt.hash
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create rental');
      }

      setRentalResult(result.data);
      console.log('Rental created successfully:', result.data);

    } catch (error: any) {
      console.error('Rental error:', error);
      setError(error.message || 'Failed to create rental');
    } finally {
      setIsRenting(false);
    }
  };

  const handleFakePayment = async () => {
    try {
      setIsRenting(true);
      setError('');

      // Generate a proper fake customer address for testing (42 chars with valid hex)
      const fakeCustomerAddress = '0x' + '1234567890abcdef'.repeat(2) + '12345678';
      const fakeTxHash = '0xfake' + Math.random().toString(16).substr(2, 60);

      console.log('Creating rental job with fake payment...');
      const response = await fetch('http://localhost:5000/api/rental/create-rental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: node.node_id,
          customerAddress: fakeCustomerAddress,
          durationHours: duration,
          description: description + ' - FAKE PAYMENT TEST',
          paymentTxHash: fakeTxHash,
          isFakePayment: true // Flag to skip payment verification
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create rental');
      }

      setRentalResult(result.data);
      console.log('Fake rental created successfully:', result.data);

    } catch (error: any) {
      console.error('Fake rental error:', error);
      setError(error.message || 'Failed to create rental');
    } finally {
      setIsRenting(false);
    }
  };

  const handleClose = () => {
    setRentalResult(null);
    setError('');
    setDuration(1);
    setDescription('SSH Server Access');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Rent SSH Node</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Testnet Notice */}
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 text-lg">🧪</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Avalanche Fuji Testnet</p>
              <p className="text-xs text-green-600">
                This uses FREE testnet AVAX. Get free coins at <a href="https://faucet.avax.network/" target="_blank" rel="noopener noreferrer" className="underline font-medium">faucet.avax.network</a>
              </p>
            </div>
          </div>
        </div>

        {!rentalResult ? (
          <div>
            {/* Node Information */}
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Node Details</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Node ID:</span> {node.node_id}</p>
                <p><span className="font-medium">CPU:</span> {node.capabilities.cpu_cores} cores</p>
                <p><span className="font-medium">Memory:</span> {node.capabilities.memory_gb}GB</p>
                <p><span className="font-medium">GPU:</span> {node.capabilities.gpu_count > '0' ? 
                  `${node.capabilities.gpu_count}x ${node.capabilities.gpu_type}` : 'None'}</p>
                <p><span className="font-medium">Price:</span> {node.pricing.per_hour} {node.pricing.currency}/hour</p>
              </div>
            </div>

            {/* Rental Configuration */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Duration (hours)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will you use this for?"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Cost Summary */}
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <h3 className="font-semibold mb-2">Cost Summary</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Duration:</span> {duration} hour{duration > 1 ? 's' : ''}</p>
                <p><span className="font-medium">Rate:</span> {node.pricing.per_hour} {node.pricing.currency}/hour</p>
                <p className="text-lg font-bold text-blue-600">
                  <span className="font-medium">Total:</span> {totalCost} {node.pricing.currency}
                </p>
                <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded">
                  <p className="text-sm text-green-700 font-medium">
                    🟢 <strong>FREE TESTNET AVAX</strong> - This is Avalanche Fuji testnet
                  </p>
                  <p className="text-xs text-green-600">
                    Get free testnet AVAX at: <a href="https://faucet.avax.network/" target="_blank" rel="noopener noreferrer" className="underline">https://faucet.avax.network/</a>
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  disabled={isRenting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRentNow}
                  disabled={isRenting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRenting ? 'Processing...' : `Pay ${totalCost} Testnet AVAX (FREE)`}
                </button>
              </div>
              
              {/* Fake Payment Button for Testing */}
              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={handleFakePayment}
                  disabled={isRenting}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
                >
                  {isRenting ? 'Processing...' : '🧪 Fake Payment (Testing Only)'}
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Skip MetaMask transaction for development testing
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Success Result */
          <div>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-green-600">Rental Successful!</h3>
            </div>

            <div className="space-y-3 mb-4">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-semibold mb-2">SSH Connection Details</h4>
                <div className="text-sm space-y-1 font-mono">
                  <p><span className="font-medium">Host:</span> {rentalResult.sshCredentials.host}</p>
                  <p><span className="font-medium">Port:</span> {rentalResult.sshCredentials.port}</p>
                  <p><span className="font-medium">Username:</span> {rentalResult.sshCredentials.username}</p>
                  <p><span className="font-medium">Password:</span> {rentalResult.sshCredentials.password}</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded">
                <h4 className="font-semibold mb-2">Rental Details</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Job ID:</span> {rentalResult.jobId}</p>
                  <p><span className="font-medium">Duration:</span> {rentalResult.duration} hour{rentalResult.duration > 1 ? 's' : ''}</p>
                  <p><span className="font-medium">Total Cost:</span> {rentalResult.totalCost} AVAX</p>
                  <p><span className="font-medium">Valid Until:</span> {new Date(rentalResult.validUntil).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">⚠️ Important:</span> Save these credentials! 
                  Your SSH access will automatically expire after {rentalResult.duration} hour{rentalResult.duration > 1 ? 's' : ''}.
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentNowModal;
