const { createAvalancheClient } = require('@avalanche-sdk/client');
const { Avalanche } = require('@avalanche-sdk/chainkit');
const { avalanche, avalancheFuji } = require('@avalanche-sdk/client/chains');
require('dotenv').config();

/**
 * Avalanche SDK Client Wrapper
 * Provides easy access to Avalanche blockchain interactions
 */

// Network configurations
const NETWORKS = {
    fuji: {
        chain: avalancheFuji,
        rpcUrl: process.env.FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
        chainId: '43113'
    },
    mainnet: {
        chain: avalanche,
        rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
        chainId: '43114'
    }
};

/**
 * Create an Avalanche client for direct blockchain interactions
 * @param {string} network - 'fuji' or 'mainnet'
 * @returns {Object} Avalanche client instance
 */
function createEryzaClient(network = 'fuji') {
    const config = NETWORKS[network];
    if (!config) {
        throw new Error(`Unsupported network: ${network}. Use 'fuji' or 'mainnet'`);
    }

    return createAvalancheClient({
        chain: config.chain,
        transport: {
            type: "http",
            url: config.rpcUrl
        }
    });
}

/**
 * Create a ChainKit client for data API access
 * @param {string} network - 'fuji' or 'mainnet'
 * @returns {Object} ChainKit client instance
 */
function createEryzaDataClient(network = 'fuji') {
    const config = NETWORKS[network];
    if (!config) {
        throw new Error(`Unsupported network: ${network}. Use 'fuji' or 'mainnet'`);
    }

    return new Avalanche({
        chainId: config.chainId,
        // Add API key if you have one for rate limiting
        apiKey: process.env.GLACIER_API_KEY
    });
}

/**
 * Get account balance in AVAX
 * @param {string} address - Wallet address
 * @param {string} network - 'fuji' or 'mainnet'
 * @returns {Promise<string>} Balance in AVAX
 */
async function getAvaxBalance(address, network = 'fuji') {
    const client = createEryzaClient(network);
    const balance = await client.getBalance({ address });
    return client.formatEther(balance);
}

/**
 * Get ERC20 token balances for an address
 * @param {string} address - Wallet address
 * @param {string} network - 'fuji' or 'mainnet'
 * @returns {Promise<Array>} Array of token balances
 */
async function getTokenBalances(address, network = 'fuji') {
    const dataClient = createEryzaDataClient(network);
    
    try {
        const result = await dataClient.data.evm.address.balances.listErc20({
            address: address,
        });
        return result.erc20TokenBalances || [];
    } catch (error) {
        console.warn('Failed to fetch token balances:', error.message);
        return [];
    }
}

/**
 * Get transaction history for an address
 * @param {string} address - Wallet address
 * @param {string} network - 'fuji' or 'mainnet'
 * @param {number} limit - Number of transactions to fetch (default: 10)
 * @returns {Promise<Array>} Array of transactions
 */
async function getTransactionHistory(address, network = 'fuji', limit = 10) {
    const dataClient = createEryzaDataClient(network);
    
    try {
        const result = await dataClient.data.evm.address.transactions.list({
            address: address,
            pageSize: limit
        });
        return result.transactions || [];
    } catch (error) {
        console.warn('Failed to fetch transaction history:', error.message);
        return [];
    }
}

/**
 * Get contract information
 * @param {string} contractAddress - Contract address
 * @param {string} network - 'fuji' or 'mainnet'
 * @returns {Promise<Object>} Contract information
 */
async function getContractInfo(contractAddress, network = 'fuji') {
    const client = createEryzaClient(network);
    
    try {
        const code = await client.getBytecode({ address: contractAddress });
        const isContract = code && code !== '0x';
        
        return {
            address: contractAddress,
            isContract,
            bytecode: code,
            network
        };
    } catch (error) {
        console.warn('Failed to fetch contract info:', error.message);
        return null;
    }
}

/**
 * Estimate gas for a transaction
 * @param {Object} txParams - Transaction parameters
 * @param {string} network - 'fuji' or 'mainnet'
 * @returns {Promise<bigint>} Estimated gas
 */
async function estimateGas(txParams, network = 'fuji') {
    const client = createEryzaClient(network);
    return await client.estimateGas(txParams);
}

/**
 * Get current gas price
 * @param {string} network - 'fuji' or 'mainnet'
 * @returns {Promise<bigint>} Current gas price
 */
async function getGasPrice(network = 'fuji') {
    const client = createEryzaClient(network);
    return await client.getGasPrice();
}

/**
 * Utility to format wei to ether
 * @param {bigint|string} wei - Wei amount
 * @returns {string} Formatted ether amount
 */
function formatEther(wei) {
    const client = createEryzaClient('fuji'); // Network doesn't matter for formatting
    return client.formatEther(wei);
}

/**
 * Utility to parse ether to wei
 * @param {string} ether - Ether amount
 * @returns {bigint} Wei amount
 */
function parseEther(ether) {
    const client = createEryzaClient('fuji'); // Network doesn't matter for parsing
    return client.parseEther(ether);
}

module.exports = {
    createEryzaClient,
    createEryzaDataClient,
    getAvaxBalance,
    getTokenBalances,
    getTransactionHistory,
    getContractInfo,
    estimateGas,
    getGasPrice,
    formatEther,
    parseEther,
    NETWORKS
};