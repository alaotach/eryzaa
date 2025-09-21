#!/usr/bin/env node

/**
 * Blockchain Integration for Eryzaa CLI Rental System
 * Registers SSH rental nodes with Avalanche Fuji contracts
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '../.env') });

// Contract ABIs (simplified for node registration)
const MARKETPLACE_ABI = [
    "function registerComputeNode(string nodeType, uint256 cpuCores, uint256 memoryGB, uint256 gpuCount, string gpuType, uint256 pricePerHour, string endpoint) external returns (uint256)",
    "function updateNodeAvailability(uint256 nodeId, bool available) external",
    "function updateNodePrice(uint256 nodeId, uint256 newPrice) external",
    "function getAvailableNodes(string nodeType) external view returns (uint256[])",
    "function getNodeInfo(uint256 nodeId) external view returns (tuple(address provider, string nodeType, uint256 cpuCores, uint256 memoryGB, uint256 gpuCount, string gpuType, uint256 pricePerHour, bool available, uint256 totalJobs, uint256 successfulJobs, string endpoint))",
    "function getProviderNodes(address provider) external view returns (uint256[])"
];

const LEDGER_ABI = [
    "function submitJob(address client, string jobType, string description, string inputDataHash, string configHash, uint256 estimatedDuration, uint256 totalCost, uint8 priority, bool isPrivate, string metadata) external returns (uint256)",
    "function updateJobPhase(uint256 jobId, uint8 newPhase) external",
    "function getJob(uint256 jobId) external view returns (tuple(uint256 jobId, address client, address provider, uint256 nodeId, string jobType, string jobDescription, string inputDataHash, string outputDataHash, string configHash, uint256 estimatedDuration, uint256 actualDuration, uint256 totalCost, uint256 submitTime, uint256 startTime, uint256 endTime, uint8 currentPhase, uint8 priority, uint8 result, uint8 qualityScore, bool isPrivate, string metadata))"
];

class BlockchainIntegration {
    constructor() {
        this.network = process.env.DEPLOY_NETWORK || 'fuji';
        this.rpcUrl = this.network === 'fuji' ? 
            process.env.AVALANCHE_FUJI_URL || 'https://api.avax-test.network/ext/bc/C/rpc' :
            process.env.AVALANCHE_MAINNET_URL || 'https://api.avax.network/ext/bc/C/rpc';
        
        this.marketplaceAddress = process.env.ERYZA_MARKETPLACE_ADDRESS;
        this.ledgerAddress = process.env.ERYZA_LEDGER_ADDRESS;
        
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
        this.wallet = null;
        this.marketplace = null;
        this.ledger = null;
        
        this.nodeStateFile = '/tmp/eryzaa_node_state.json';
        
        this.initializeContracts();
    }

    initializeContracts() {
        try {
            if (process.env.PRIVATE_KEY) {
                this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
                
                if (this.marketplaceAddress && this.marketplaceAddress !== '0x3456789012345678901234567890123456789012') {
                    this.marketplace = new ethers.Contract(this.marketplaceAddress, MARKETPLACE_ABI, this.wallet);
                }
                
                if (this.ledgerAddress) {
                    this.ledger = new ethers.Contract(this.ledgerAddress, LEDGER_ABI, this.wallet);
                }
            }
        } catch (error) {
            console.error("Failed to initialize contracts:", error.message);
        }
    }

    async getSystemInfo() {
        const os = require('os');
        const { execSync } = require('child_process');
        
        try {
            // Get system specs
            const cpuCount = os.cpus().length;
            const totalMemoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
            
            // Try to detect GPU
            let gpuCount = 0;
            let gpuType = "none";
            try {
                const nvidia = execSync('nvidia-smi --query-gpu=count --format=csv,noheader,nounits', { encoding: 'utf8' });
                gpuCount = parseInt(nvidia.trim()) || 0;
                if (gpuCount > 0) {
                    const gpuInfo = execSync('nvidia-smi --query-gpu=name --format=csv,noheader', { encoding: 'utf8' });
                    gpuType = gpuInfo.trim().split('\n')[0] || "NVIDIA GPU";
                }
            } catch (e) {
                // No NVIDIA GPU
            }
            
            // Get network IP
            let endpoint = "unknown";
            try {
                const ip = execSync("ip route get 8.8.8.8 | grep -oP 'src \\K\\S+'", { encoding: 'utf8' }).trim();
                endpoint = ip;
                
                // Try to get ZeroTier IP if available
                try {
                    const ztIP = execSync("zerotier-cli listnetworks | grep 363c67c55ad2489d | awk '{print $9}' | cut -d'/' -f1", { encoding: 'utf8' }).trim();
                    if (ztIP && ztIP !== "") {
                        endpoint = ztIP;
                    }
                } catch (e) {
                    // ZeroTier not available
                }
            } catch (e) {
                // Fallback to hostname
                endpoint = os.hostname();
            }
            
            return {
                cpuCores: cpuCount,
                memoryGB: totalMemoryGB,
                gpuCount: gpuCount,
                gpuType: gpuType,
                endpoint: endpoint
            };
        } catch (error) {
            console.error("Failed to get system info:", error.message);
            return {
                cpuCores: 4,
                memoryGB: 8,
                gpuCount: 0,
                gpuType: "none",
                endpoint: "unknown"
            };
        }
    }

    loadNodeState() {
        try {
            if (fs.existsSync(this.nodeStateFile)) {
                return JSON.parse(fs.readFileSync(this.nodeStateFile, 'utf8'));
            }
        } catch (error) {
            console.error("Failed to load node state:", error.message);
        }
        return null;
    }

    saveNodeState(state) {
        try {
            fs.writeFileSync(this.nodeStateFile, JSON.stringify(state, null, 2));
        } catch (error) {
            console.error("Failed to save node state:", error.message);
        }
    }

    async registerNode() {
        if (!this.marketplace) {
            console.error("❌ Marketplace contract not available");
            console.log("   Set ERYZA_MARKETPLACE_ADDRESS in .env file");
            return false;
        }

        try {
            console.log("🔍 Getting system information...");
            const systemInfo = await this.getSystemInfo();
            
            console.log("📊 System Info:");
            console.log(`  CPU Cores: ${systemInfo.cpuCores}`);
            console.log(`  Memory: ${systemInfo.memoryGB}GB`);
            console.log(`  GPU: ${systemInfo.gpuCount > 0 ? `${systemInfo.gpuCount}x ${systemInfo.gpuType}` : 'None'}`);
            console.log(`  Endpoint: ${systemInfo.endpoint}`);
            
            // Default pricing: $0.50/hour for SSH access
            const pricePerHour = ethers.utils.parseEther("0.5");
            
            console.log("\n🚀 Registering node with blockchain...");
            
            const tx = await this.marketplace.registerComputeNode(
                "ssh",                    // nodeType
                systemInfo.cpuCores,      // cpuCores
                systemInfo.memoryGB,      // memoryGB
                systemInfo.gpuCount,      // gpuCount
                systemInfo.gpuType,       // gpuType
                pricePerHour,             // pricePerHour (0.5 AVAX)
                systemInfo.endpoint       // endpoint
            );
            
            console.log("⏳ Waiting for transaction confirmation...");
            const receipt = await tx.wait();
            
            // Extract node ID from events
            let nodeId = null;
            if (receipt.events && receipt.events.length > 0) {
                const event = receipt.events.find(e => e.event === 'ComputeNodeRegistered');
                nodeId = event ? event.args.nodeId.toString() : null;
            }
            
            // If events parsing failed, try to get from logs
            if (!nodeId && receipt.logs && receipt.logs.length > 0) {
                try {
                    for (const log of receipt.logs) {
                        const parsedLog = this.marketplace.interface.parseLog(log);
                        if (parsedLog.name === 'ComputeNodeRegistered') {
                            nodeId = parsedLog.args.nodeId.toString();
                            break;
                        }
                    }
                } catch (e) {
                    console.log("Could not parse logs, but transaction was successful");
                }
            }
            
            if (nodeId) {
                console.log(`✅ Node registered successfully!`);
                console.log(`   Node ID: ${nodeId}`);
                console.log(`   Transaction: ${receipt.transactionHash}`);
                console.log(`   Price: ${ethers.utils.formatEther(pricePerHour)} AVAX/hour`);
                
                // Save node state
                const nodeState = {
                    nodeId: nodeId,
                    address: this.wallet.address,
                    transactionHash: receipt.transactionHash,
                    registeredAt: new Date().toISOString(),
                    systemInfo: systemInfo,
                    pricePerHour: pricePerHour.toString()
                };
                
                this.saveNodeState(nodeState);
                return true;
            } else {
                console.log("⚠️  Could not extract node ID from events, but transaction was successful");
                console.log(`   Transaction: ${receipt.transactionHash}`);
                
                // Try to get node ID by querying provider's nodes
                try {
                    console.log("🔍 Looking up node ID...");
                    const providerNodes = await this.marketplace.getProviderNodes(this.wallet.address);
                    if (providerNodes.length > 0) {
                        const latestNodeId = providerNodes[providerNodes.length - 1].toString();
                        console.log(`✅ Found node ID: ${latestNodeId}`);
                        
                        const nodeState = {
                            nodeId: latestNodeId,
                            address: this.wallet.address,
                            transactionHash: receipt.transactionHash,
                            registeredAt: new Date().toISOString(),
                            systemInfo: systemInfo,
                            pricePerHour: pricePerHour.toString()
                        };
                        
                        this.saveNodeState(nodeState);
                        return true;
                    }
                } catch (lookupError) {
                    console.log("Could not lookup node ID:", lookupError.message);
                }
                
                console.log("✅ Registration transaction successful, but could not determine node ID");
                console.log("   You can check on Snowtrace: https://testnet.snowtrace.io/tx/" + receipt.transactionHash);
                return false;
            }
            
        } catch (error) {
            console.error("❌ Registration failed:", error.message);
            if (error.code === 'INSUFFICIENT_FUNDS') {
                console.log("   💰 Insufficient AVAX for gas fees");
                console.log("   💡 Get testnet AVAX from: https://faucet.avax.network/");
            }
            return false;
        }
    }

    async updateAvailability(available = true) {
        const nodeState = this.loadNodeState();
        if (!nodeState || !this.marketplace) {
            console.error("❌ Node not registered or marketplace unavailable");
            return false;
        }

        try {
            console.log(`🔄 Setting node availability to: ${available ? 'AVAILABLE' : 'UNAVAILABLE'}`);
            
            const tx = await this.marketplace.updateNodeAvailability(nodeState.nodeId, available);
            await tx.wait();
            
            console.log(`✅ Node availability updated`);
            console.log(`   Node ID: ${nodeState.nodeId}`);
            console.log(`   Status: ${available ? 'Available for rental' : 'Unavailable'}`);
            
            return true;
        } catch (error) {
            console.error("❌ Failed to update availability:", error.message);
            return false;
        }
    }

    async getAvailableNodes() {
        if (!this.marketplace) {
            console.error("❌ Marketplace contract not available");
            return [];
        }

        try {
            const nodeIds = await this.marketplace.getAvailableNodes("ssh");
            console.log(`📋 Found ${nodeIds.length} available SSH nodes`);
            
            for (let i = 0; i < nodeIds.length; i++) {
                const nodeInfo = await this.marketplace.getNodeInfo(nodeIds[i]);
                console.log(`   Node ${nodeIds[i]}: ${nodeInfo.cpuCores} CPU, ${nodeInfo.memoryGB}GB RAM, ${ethers.utils.formatEther(nodeInfo.pricePerHour)} AVAX/hr`);
            }
            
            return nodeIds;
        } catch (error) {
            console.error("❌ Failed to get available nodes:", error.message);
            return [];
        }
    }

    async getNodeStatus() {
        const nodeState = this.loadNodeState();
        if (!nodeState) {
            console.log("❌ Node not registered with blockchain");
            return false;
        }

        if (!this.marketplace) {
            console.log("⚠️  Marketplace contract not available (check .env configuration)");
            console.log(`📝 Node State: ID ${nodeState.nodeId}, registered at ${nodeState.registeredAt}`);
            return true;
        }

        try {
            const nodeInfo = await this.marketplace.getNodeInfo(nodeState.nodeId);
            
            console.log("📊 Blockchain Node Status:");
            console.log(`   Node ID: ${nodeState.nodeId}`);
            console.log(`   Provider: ${nodeInfo.provider}`);
            console.log(`   Type: ${nodeInfo.nodeType}`);
            console.log(`   CPU: ${nodeInfo.cpuCores} cores`);
            console.log(`   Memory: ${nodeInfo.memoryGB}GB`);
            console.log(`   GPU: ${nodeInfo.gpuCount > 0 ? `${nodeInfo.gpuCount}x ${nodeInfo.gpuType}` : 'None'}`);
            console.log(`   Price: ${ethers.utils.formatEther(nodeInfo.pricePerHour)} AVAX/hour`);
            console.log(`   Available: ${nodeInfo.available ? '✅ YES' : '❌ NO'}`);
            console.log(`   Total Jobs: ${nodeInfo.totalJobs}`);
            console.log(`   Successful: ${nodeInfo.successfulJobs}`);
            console.log(`   Endpoint: ${nodeInfo.endpoint}`);
            
            return true;
        } catch (error) {
            console.error("❌ Failed to get node status:", error.message);
            return false;
        }
    }

    async checkBalance() {
        if (!this.wallet) {
            console.error("❌ Wallet not configured");
            return false;
        }

        try {
            const balance = await this.wallet.getBalance();
            const balanceInAvax = ethers.utils.formatEther(balance);
            
            console.log("💰 Wallet Balance:");
            console.log(`   Address: ${this.wallet.address}`);
            console.log(`   Balance: ${balanceInAvax} AVAX`);
            console.log(`   Network: ${this.network}`);
            
            if (parseFloat(balanceInAvax) < 0.1) {
                console.log("⚠️  Low balance! Get testnet AVAX from: https://faucet.avax.network/");
            }
            
            return true;
        } catch (error) {
            console.error("❌ Failed to check balance:", error.message);
            return false;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    const blockchain = new BlockchainIntegration();
    
    console.log("🔗 Eryzaa Blockchain Integration");
    console.log(`   Network: ${blockchain.network}`);
    console.log(`   RPC: ${blockchain.rpcUrl}`);
    
    switch (command) {
        case 'register':
            await blockchain.registerNode();
            break;
            
        case 'start':
            await blockchain.updateAvailability(true);
            break;
            
        case 'stop':
            await blockchain.updateAvailability(false);
            break;
            
        case 'status':
            await blockchain.getNodeStatus();
            break;
            
        case 'nodes':
            await blockchain.getAvailableNodes();
            break;
            
        case 'balance':
            await blockchain.checkBalance();
            break;
            
        case 'help':
        default:
            console.log("\nUsage: node blockchain_integration.js [command]");
            console.log("\nCommands:");
            console.log("  register  🚀 Register this node with blockchain");
            console.log("  start     ▶️  Set node as available for rental");
            console.log("  stop      ⏹️  Set node as unavailable");
            console.log("  status    📊 Show node status on blockchain");
            console.log("  nodes     📋 List all available SSH nodes");
            console.log("  balance   💰 Check wallet balance");
            console.log("  help      ❓ Show this help");
            console.log("\nSetup:");
            console.log("  1. Set PRIVATE_KEY in .env file");
            console.log("  2. Set ERYZA_MARKETPLACE_ADDRESS in .env file");
            console.log("  3. Get testnet AVAX: https://faucet.avax.network/");
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BlockchainIntegration;
