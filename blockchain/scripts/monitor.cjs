const { ethers } = require("hardhat");
const { 
    createEryzaClient,
    createEryzaDataClient,
    getAvaxBalance,
    formatEther
} = require("../utils/avalanche-client.cjs");
require('dotenv').config();

/**
 * Real-time monitoring script using Avalanche SDK
 * Demonstrates how to monitor contracts and network activity
 */

class EryzaMonitor {
    constructor(network = 'fuji') {
        this.network = network;
        this.client = createEryzaClient(network);
        this.dataClient = createEryzaDataClient(network);
        this.isMonitoring = false;
    }

    async initialize() {
        try {
            this.EryzaToken = await ethers.getContract("EryzaToken");
            this.EryzaJobEscrow = await ethers.getContract("EryzaJobEscrow");
            
            this.tokenContract = await ethers.getContractAt("EryzaToken", this.EryzaToken.address);
            this.escrowContract = await ethers.getContractAt("EryzaJobEscrow", this.EryzaJobEscrow.address);
            
            console.log(`✅ Monitor initialized for ${this.network}`);
            console.log(`📍 EryzaToken: ${this.EryzaToken.address}`);
            console.log(`📍 EryzaJobEscrow: ${this.EryzaJobEscrow.address}`);
            
        } catch (error) {
            console.error("❌ Failed to initialize monitor:", error.message);
            throw error;
        }
    }

    async monitorBlocks() {
        console.log("\n🧱 Starting block monitoring...");
        
        let lastBlock = await this.client.getBlockNumber();
        console.log(`Starting from block: ${lastBlock}`);

        const checkNewBlocks = async () => {
            try {
                const currentBlock = await this.client.getBlockNumber();
                
                if (currentBlock > lastBlock) {
                    const block = await this.client.getBlock({ 
                        blockNumber: currentBlock,
                        includeTransactions: true 
                    });
                    
                    console.log(`\n🆕 New Block #${currentBlock}`);
                    console.log(`⏰ Timestamp: ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
                    console.log(`📊 Transactions: ${block.transactions.length}`);
                    console.log(`⛽ Gas Used: ${block.gasUsed.toString()}`);
                    
                    // Check if any transactions involve our contracts
                    const contractTxs = block.transactions.filter(tx => 
                        tx.to === this.EryzaToken.address || 
                        tx.to === this.EryzaJobEscrow.address
                    );
                    
                    if (contractTxs.length > 0) {
                        console.log(`🎯 Found ${contractTxs.length} transactions to our contracts!`);
                        contractTxs.forEach(tx => {
                            console.log(`   TX: ${tx.hash}`);
                            console.log(`   To: ${tx.to}`);
                            console.log(`   Value: ${formatEther(tx.value)} AVAX`);
                        });
                    }
                    
                    lastBlock = currentBlock;
                }
            } catch (error) {
                console.error("Block monitoring error:", error.message);
            }
        };

        // Check for new blocks every 3 seconds
        const interval = setInterval(checkNewBlocks, 3000);
        
        // Stop after 60 seconds for demo
        setTimeout(() => {
            clearInterval(interval);
            console.log("\n⏹️  Block monitoring stopped");
        }, 60000);
    }

    async monitorEvents() {
        console.log("\n🎯 Setting up event monitoring...");

        try {
            // Monitor Transfer events on EryzaToken
            this.tokenContract.on("Transfer", (from, to, amount, event) => {
                console.log(`\n💸 Token Transfer Detected:`);
                console.log(`   From: ${from}`);
                console.log(`   To: ${to}`);
                console.log(`   Amount: ${formatEther(amount)} ERY`);
                console.log(`   TX: ${event.transactionHash}`);
                console.log(`   Block: ${event.blockNumber}`);
            });

            // Monitor other events if available
            try {
                this.tokenContract.on("TokensLocked", (jobId, user, provider, amount, event) => {
                    console.log(`\n🔒 Tokens Locked:`);
                    console.log(`   Job ID: ${jobId}`);
                    console.log(`   User: ${user}`);
                    console.log(`   Provider: ${provider}`);
                    console.log(`   Amount: ${formatEther(amount)} ERY`);
                    console.log(`   TX: ${event.transactionHash}`);
                });

                this.tokenContract.on("TokensReleased", (jobId, provider, amount, event) => {
                    console.log(`\n🔓 Tokens Released:`);
                    console.log(`   Job ID: ${jobId}`);
                    console.log(`   Provider: ${provider}`);
                    console.log(`   Amount: ${formatEther(amount)} ERY`);
                    console.log(`   TX: ${event.transactionHash}`);
                });
            } catch (error) {
                console.log("Additional events not available on this contract");
            }

            console.log("✅ Event listeners set up. Waiting for events...");
            
        } catch (error) {
            console.error("Event monitoring setup failed:", error.message);
        }
    }

    async getNetworkStats() {
        console.log("\n📊 Network Statistics:");
        
        try {
            const latestBlock = await this.client.getBlockNumber();
            const gasPrice = await this.client.getGasPrice();
            
            console.log(`Latest Block: ${latestBlock}`);
            console.log(`Gas Price: ${gasPrice.toString()} wei`);
            console.log(`Gas Price: ${formatEther(gasPrice)} AVAX per gas unit`);
            
            // Get some recent blocks for average metrics
            const blocks = [];
            for (let i = 0; i < 5; i++) {
                const block = await this.client.getBlock({ 
                    blockNumber: latestBlock - BigInt(i) 
                });
                blocks.push(block);
            }
            
            const avgGasUsed = blocks.reduce((sum, block) => sum + Number(block.gasUsed), 0) / blocks.length;
            const avgTxCount = blocks.reduce((sum, block) => sum + block.transactions.length, 0) / blocks.length;
            
            console.log(`Average Gas Used (last 5 blocks): ${avgGasUsed.toFixed(0)}`);
            console.log(`Average TX Count (last 5 blocks): ${avgTxCount.toFixed(1)}`);
            
        } catch (error) {
            console.error("Network stats failed:", error.message);
        }
    }

    async getContractStats() {
        console.log("\n📈 Contract Statistics:");
        
        try {
            // Token stats
            const name = await this.tokenContract.name();
            const symbol = await this.tokenContract.symbol();
            const totalSupply = await this.tokenContract.totalSupply();
            
            console.log(`\n🪙 ${name} (${symbol}):`);
            console.log(`   Total Supply: ${formatEther(totalSupply)} ${symbol}`);
            
            // Get deployer balance
            const [deployer] = await ethers.getSigners();
            const deployerBalance = await this.tokenContract.balanceOf(deployer.address);
            console.log(`   Deployer Balance: ${formatEther(deployerBalance)} ${symbol}`);
            
            // Get recent Transfer events for activity stats
            const latestBlock = await this.client.getBlockNumber();
            const fromBlock = Math.max(0, Number(latestBlock) - 1000);
            
            const transferFilter = this.tokenContract.filters.Transfer();
            const events = await this.tokenContract.queryFilter(transferFilter, fromBlock);
            
            console.log(`   Recent Transfers (last 1000 blocks): ${events.length}`);
            
            if (events.length > 0) {
                const uniqueAddresses = new Set();
                let totalTransferred = BigInt(0);
                
                events.forEach(event => {
                    uniqueAddresses.add(event.args.from);
                    uniqueAddresses.add(event.args.to);
                    totalTransferred += event.args.value;
                });
                
                console.log(`   Unique Active Addresses: ${uniqueAddresses.size}`);
                console.log(`   Total Volume: ${formatEther(totalTransferred)} ${symbol}`);
            }
            
        } catch (error) {
            console.error("Contract stats failed:", error.message);
        }
    }

    async startMonitoring() {
        console.log("🚀 Starting Eryza Network Monitor...");
        this.isMonitoring = true;
        
        await this.initialize();
        await this.getNetworkStats();
        await this.getContractStats();
        
        // Start event monitoring (runs in background)
        await this.monitorEvents();
        
        // Start block monitoring (runs for 60 seconds)
        await this.monitorBlocks();
        
        console.log("\n🏁 Monitoring session completed!");
    }

    stop() {
        this.isMonitoring = false;
        // Remove all event listeners
        this.tokenContract.removeAllListeners();
        console.log("🛑 Monitoring stopped");
    }
}

async function main() {
    const network = process.env.NETWORK || 'fuji';
    const monitor = new EryzaMonitor(network);
    
    try {
        await monitor.startMonitoring();
    } catch (error) {
        console.error("❌ Monitoring failed:", error);
        monitor.stop();
    } finally {
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down monitor...');
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { EryzaMonitor };