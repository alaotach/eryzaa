const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// Contract configuration
const MARKETPLACE_ADDRESS = process.env.ERYZA_MARKETPLACE_ADDRESS;
const JOBS_LEDGER_ADDRESS = process.env.ERYZA_JOBS_LEDGER_ADDRESS;

const MARKETPLACE_ABI = [
    "function getNodeInfo(uint256 nodeId) external view returns (tuple(address provider, string nodeType, uint256 cpuCores, uint256 memoryGB, uint256 gpuCount, string gpuType, uint256 pricePerHour, bool available, uint256 totalJobs, uint256 successfulJobs, string endpoint))",
    "function createJob(uint256 nodeId, uint256 durationHours, string description) external payable returns (uint256 jobId)",
    "function getJobInfo(uint256 jobId) external view returns (uint256 nodeId, address customer, uint256 startTime, uint256 durationHours, uint256 totalCost, string status, string sshCredentials, string description)"
];

const JOBS_LEDGER_ABI = [
    "function createRentalJob(uint256 nodeId, address customer, uint256 durationHours, uint256 totalCost, string description) external returns (uint256 jobId)",
    "function getJobInfo(uint256 jobId) external view returns (address customer, uint256 nodeId, uint256 startTime, uint256 durationHours, uint256 totalCost, string status, string sshCredentials, string description)"
];

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc");

// Create rental job endpoint
router.post('/create-rental', async (req, res) => {
    try {
        const { nodeId, customerAddress, durationHours, description, paymentTxHash } = req.body;

        // Validate required fields
        if (!nodeId || !customerAddress || !durationHours || !paymentTxHash) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: nodeId, customerAddress, durationHours, paymentTxHash'
            });
        }

        // Check if this is a fake payment first
        const isFakePayment = req.body.isFakePayment || 
                             (paymentTxHash.includes('fake') && description && description.includes('FAKE PAYMENT TEST'));

        // Validate Ethereum address (skip validation for fake payments)
        if (!isFakePayment && !ethers.isAddress(customerAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid customer address format'
            });
        }

        // For fake payments, ensure customer address is properly formatted
        if (isFakePayment && (!customerAddress.startsWith('0x') || customerAddress.length !== 42)) {
            // Generate a proper test address if needed
            customerAddress = '0x' + '1'.repeat(40); // Use a valid test address
        }

        // Get node info from marketplace
        const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
        const nodeInfo = await marketplace.getNodeInfo(nodeId);

        // Check if node is available
        if (!nodeInfo.available) {
            return res.status(400).json({
                success: false,
                error: 'Node is not available for rental'
            });
        }

        // Calculate total cost (ethers v6 uses BigInt)
        const pricePerHour = nodeInfo.pricePerHour;
        const totalCost = pricePerHour * BigInt(durationHours);

        // Verify payment transaction (skip for fake payments)
        let tx, receipt;
        if (!isFakePayment) {
            tx = await provider.getTransaction(paymentTxHash);
            if (!tx) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment transaction not found'
                });
            }

            receipt = await provider.getTransactionReceipt(paymentTxHash);
            if (!receipt || receipt.status !== 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment transaction failed or pending'
                });
            }

            // Check if payment amount is sufficient (ethers v6 BigInt comparison)
            if (tx.value < totalCost) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient payment. Required: ${ethers.formatEther(totalCost)} AVAX, Received: ${ethers.formatEther(tx.value)} AVAX`
                });
            }
        } else {
            console.log('🧪 Processing fake payment for testing purposes');
        }

        // Create SSH user for the rental in Ubuntu container
        const timestamp = Date.now().toString().slice(-8); // Get last 8 digits
        const sshUsername = `eryzaa_job_${timestamp}`;
        const sshPassword = 'eryzaa123'; // Hardcoded password for all users

        // Create SSH user directly in the Ubuntu container
        const { spawn } = require('child_process');
        const sshResult = await new Promise((resolve, reject) => {
            // Ensure container is running
            const startContainer = spawn('docker', ['start', 'eryzaa-ubuntu-ssh']);
            startContainer.on('close', () => {
                // Create user in container
                const createUser = spawn('docker', ['exec', 'eryzaa-ubuntu-ssh', 'useradd', '-m', '-s', '/bin/bash', sshUsername]);
                createUser.on('close', (code1) => {
                    if (code1 !== 0) {
                        reject(new Error(`Failed to create user ${sshUsername}`));
                        return;
                    }
                    
                    // Set password
                    const setPassword = spawn('docker', ['exec', 'eryzaa-ubuntu-ssh', 'bash', '-c', `echo '${sshUsername}:${sshPassword}' | chpasswd`]);
                    setPassword.on('close', (code2) => {
                        if (code2 !== 0) {
                            reject(new Error(`Failed to set password for ${sshUsername}`));
                            return;
                        }
                        
                        // Add to sudo group
                        const addSudo = spawn('docker', ['exec', 'eryzaa-ubuntu-ssh', 'usermod', '-aG', 'sudo', sshUsername]);
                        addSudo.on('close', (code3) => {
                            resolve({
                                success: true,
                                username: sshUsername,
                                password: sshPassword
                            });
                        });
                    });
                });
            });
        });

        if (!sshResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create SSH user for rental'
            });
        }

        // Create job record
        const jobData = {
            nodeId: parseInt(nodeId),
            customerAddress,
            startTime: Math.floor(Date.now() / 1000),
            durationHours: parseInt(durationHours),
            totalCost: totalCost.toString(),
            status: 'active',
            sshCredentials: JSON.stringify({
                host: process.env.PUBLIC_IP || 'localhost',
                port: 2222, // Ubuntu container SSH port
                username: sshUsername,
                password: sshPassword,
                validUntil: new Date(Date.now() + (durationHours * 60 * 60 * 1000)).toISOString(),
                environment: 'Ubuntu 22.04 Container',
                note: 'Connect via: ssh ' + sshUsername + '@localhost -p 2222',
                defaultPassword: 'eryzaa123 (for all users)'
            }),
            description: description || 'Ubuntu SSH Server Rental',
            paymentTxHash,
            createdAt: new Date().toISOString()
        };

        // Store job in temporary storage (you might want to use a database)
        const fs = require('fs');
        const jobsFile = '/tmp/eryzaa_rental_jobs.json';
        let jobs = [];
        
        try {
            if (fs.existsSync(jobsFile)) {
                jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
            }
        } catch (error) {
            console.log('Could not read existing jobs file, starting fresh');
        }

        const jobId = jobs.length + 1;
        jobData.jobId = jobId;
        jobs.push(jobData);
        
        fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

        // Schedule SSH user cleanup
        setTimeout(() => {
            console.log(`🧹 Cleaning up SSH user ${sshUsername} after rental period`);
            const cleanupProcess = spawn('bash', ['-c', `echo "delete_user:${sshUsername}" | nc -U /tmp/eryzaa_ssh_service.sock`]);
            cleanupProcess.on('close', (code) => {
                console.log(`SSH user ${sshUsername} cleanup completed with code ${code}`);
            });
        }, durationHours * 60 * 60 * 1000); // Convert hours to milliseconds

        res.json({
            success: true,
            data: {
                jobId,
                nodeId: jobData.nodeId,
                sshCredentials: JSON.parse(jobData.sshCredentials),
                duration: durationHours,
                totalCost: ethers.formatEther(totalCost),
                status: 'active',
                validUntil: JSON.parse(jobData.sshCredentials).validUntil
            }
        });

    } catch (error) {
        console.error('Error creating rental job:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get rental job info
router.get('/job/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const fs = require('fs');
        const jobsFile = '/tmp/eryzaa_rental_jobs.json';
        
        if (!fs.existsSync(jobsFile)) {
            return res.status(404).json({
                success: false,
                error: 'No rental jobs found'
            });
        }

        const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
        const job = jobs.find(j => j.jobId === parseInt(jobId));

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Rental job not found'
            });
        }

        // Check if job has expired
        const now = new Date();
        const validUntil = new Date(JSON.parse(job.sshCredentials).validUntil);
        const isExpired = now > validUntil;

        res.json({
            success: true,
            data: {
                jobId: job.jobId,
                nodeId: job.nodeId,
                customerAddress: job.customerAddress,
                status: isExpired ? 'expired' : job.status,
                sshCredentials: JSON.parse(job.sshCredentials),
                totalCost: ethers.formatEther(job.totalCost),
                duration: job.durationHours,
                createdAt: job.createdAt,
                isExpired
            }
        });

    } catch (error) {
        console.error('Error getting rental job:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// List all rental jobs
router.get('/jobs', async (req, res) => {
    try {
        const fs = require('fs');
        const jobsFile = '/tmp/eryzaa_rental_jobs.json';
        
        if (!fs.existsSync(jobsFile)) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
        
        // Add expiration status to each job
        const now = new Date();
        const jobsWithStatus = jobs.map(job => {
            const validUntil = new Date(JSON.parse(job.sshCredentials).validUntil);
            const isExpired = now > validUntil;
            
            return {
                jobId: job.jobId,
                nodeId: job.nodeId,
                customerAddress: job.customerAddress,
                status: isExpired ? 'expired' : job.status,
                duration: job.durationHours,
                totalCost: ethers.formatEther(job.totalCost),
                createdAt: job.createdAt,
                isExpired
            };
        });

        res.json({
            success: true,
            data: jobsWithStatus,
            count: jobsWithStatus.length
        });

    } catch (error) {
        console.error('Error listing rental jobs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
