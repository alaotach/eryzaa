const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const router = express.Router();

// Contract ABIs (simplified for reading data)
const MARKETPLACE_ABI = [
    "function getAvailableNodes(string nodeType) external view returns (uint256[])",
    "function getNodeInfo(uint256 nodeId) external view returns (tuple(address provider, string nodeType, uint256 cpuCores, uint256 memoryGB, uint256 gpuCount, string gpuType, uint256 pricePerHour, bool available, uint256 totalJobs, uint256 successfulJobs, string endpoint))",
    "function getProviderNodes(address provider) external view returns (uint256[])"
];

// Initialize blockchain connection
let marketplace = null;
let provider = null;

try {
    // Use ethers v6 syntax
    provider = new ethers.JsonRpcProvider(process.env.AVALANCHE_FUJI_URL || 'https://api.avax-test.network/ext/bc/C/rpc');
    if (process.env.ERYZA_MARKETPLACE_ADDRESS && process.env.ERYZA_MARKETPLACE_ADDRESS !== '0x3456789012345678901234567890123456789012') {
        marketplace = new ethers.Contract(process.env.ERYZA_MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
        console.log('✅ Blockchain connection initialized:', process.env.ERYZA_MARKETPLACE_ADDRESS);
    } else {
        console.log('⚠️  Marketplace address not configured properly');
    }
} catch (error) {
    console.error('❌ Failed to initialize blockchain connection:', error.message);
}

// Get active jobs from blockchain
router.get('/active-jobs', async (req, res) => {
    try {
        // For now, return empty array since we don't have active jobs tracking on blockchain yet
        // In a full implementation, you'd query the EryzaJobsLedger contract
        res.json({
            success: true,
            data: [],
            message: 'No active jobs at the moment'
        });
    } catch (error) {
        console.error('Error fetching active jobs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active jobs',
            details: error.message
        });
    }
});

// Get rental nodes from blockchain
router.get('/rental-nodes', async (req, res) => {
    try {
        if (!marketplace) {
            return res.status(500).json({
                success: false,
                error: 'Blockchain connection not available',
                details: 'Marketplace contract not initialized'
            });
        }

        // Get all SSH nodes from blockchain
        const sshNodeIds = await marketplace.getAvailableNodes("ssh");
        
        const nodes = [];
        for (const nodeId of sshNodeIds) {
            try {
                const nodeInfo = await marketplace.getNodeInfo(nodeId);
                
                nodes.push({
                    node_id: nodeId.toString(),
                    ip_address: nodeInfo.endpoint,
                    zerotier_ip: nodeInfo.endpoint.includes('.') ? null : nodeInfo.endpoint,
                    status: nodeInfo.available ? 'available' : 'busy',
                    current_job: null, // Would need to query jobs ledger
                    ssh_user: null,
                    capabilities: {
                        cpu_cores: nodeInfo.cpuCores.toString(),
                        memory_gb: nodeInfo.memoryGB.toString(),
                        gpu_count: nodeInfo.gpuCount.toString(),
                        gpu_type: nodeInfo.gpuType
                    },
                    pricing: {
                        per_hour: ethers.formatEther(nodeInfo.pricePerHour),
                        currency: 'AVAX'
                    },
                    provider: nodeInfo.provider,
                    total_jobs: nodeInfo.totalJobs.toString(),
                    successful_jobs: nodeInfo.successfulJobs.toString(),
                    last_seen: new Date().toISOString() // Would be better to get from blockchain
                });
            } catch (nodeError) {
                console.error(`Error fetching info for node ${nodeId}:`, nodeError.message);
            }
        }

        res.json({
            success: true,
            data: nodes,
            count: nodes.length,
            blockchain_address: process.env.ERYZA_MARKETPLACE_ADDRESS
        });

    } catch (error) {
        console.error('Error fetching rental nodes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rental nodes from blockchain',
            details: error.message
        });
    }
});

// Get job statistics
router.get('/job-stats', async (req, res) => {
    try {
        if (!marketplace) {
            return res.status(500).json({
                success: false,
                error: 'Blockchain connection not available'
            });
        }

        // Get SSH nodes
        const sshNodeIds = await marketplace.getAvailableNodes("ssh");
        
        let totalJobs = 0;
        let availableNodes = 0;
        let busyNodes = 0;
        
        for (const nodeId of sshNodeIds) {
            try {
                const nodeInfo = await marketplace.getNodeInfo(nodeId);
                totalJobs += parseInt(nodeInfo.totalJobs.toString());
                
                if (nodeInfo.available) {
                    availableNodes++;
                } else {
                    busyNodes++;
                }
            } catch (nodeError) {
                console.error(`Error fetching stats for node ${nodeId}:`, nodeError.message);
            }
        }

        const totalNodes = sshNodeIds.length;
        const utilization = totalNodes > 0 ? Math.round((busyNodes / totalNodes) * 100) : 0;

        const stats = {
            jobs: {
                total: totalJobs,
                active: busyNodes, // Approximation - busy nodes likely have active jobs
                completed: totalJobs - busyNodes
            },
            nodes: {
                total: totalNodes,
                available: availableNodes,
                busy: busyNodes,
                utilization: utilization
            }
        };

        res.json({
            success: true,
            data: stats,
            blockchain_network: 'Avalanche Fuji',
            contract_address: process.env.ERYZA_MARKETPLACE_ADDRESS
        });

    } catch (error) {
        console.error('Error fetching job stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch job statistics',
            details: error.message
        });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        blockchain: {
            connected: !!marketplace,
            network: 'Avalanche Fuji',
            rpc_url: process.env.AVALANCHE_FUJI_URL,
            marketplace_address: process.env.ERYZA_MARKETPLACE_ADDRESS
        }
    };

    if (marketplace) {
        try {
            // Test blockchain connection
            const nodeIds = await marketplace.getAvailableNodes("ssh");
            health.blockchain.nodes_count = nodeIds.length;
            health.blockchain.last_check = new Date().toISOString();
        } catch (error) {
            health.blockchain.error = error.message;
            health.status = 'degraded';
        }
    }

    res.json(health);
});

module.exports = router;
