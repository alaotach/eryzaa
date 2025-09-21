const express = require('express');
const router = express.Router();

// Mock data for demonstration - in real implementation, this would come from your database
let mockJobs = [
  {
    job_id: 'job_12345678',
    client_id: 'client_001',
    node_id: 'node_001',
    node_ip: '192.168.1.100',
    ssh_username: 'job_12345678',
    ssh_info: 'ssh job_12345678@192.168.1.100',
    status: 'running',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    payment_amount: 50.00
  }
];

let mockNodes = [
  {
    node_id: 'node_001',
    ip_address: '192.168.1.100',
    zerotier_ip: '10.147.17.100',
    status: 'busy',
    current_job: 'job_12345678',
    ssh_user: 'job_12345678',
    capabilities: {
      cpu_cores: 8,
      ram_gb: 32,
      gpu: 'RTX 4090',
      storage_gb: 1000
    },
    pricing: {
      hourly_rate: 2.50,
      currency: 'USD'
    },
    last_seen: new Date().toISOString()
  },
  {
    node_id: 'node_002',
    ip_address: '192.168.1.101',
    zerotier_ip: '10.147.17.101',
    status: 'active',
    current_job: null,
    ssh_user: null,
    capabilities: {
      cpu_cores: 16,
      ram_gb: 64,
      gpu: 'RTX 4080',
      storage_gb: 2000
    },
    pricing: {
      hourly_rate: 3.00,
      currency: 'USD'
    },
    last_seen: new Date().toISOString()
  }
];

// @desc    Get all active jobs with SSH access
// @route   GET /api/jobs-display/active-jobs
// @access  Public
router.get('/active-jobs', async (req, res) => {
  try {
    // In real implementation, query your database for active jobs
    const activeJobs = mockJobs.filter(job => 
      job.status === 'running' || job.status === 'accepted'
    );

    res.status(200).json({
      success: true,
      count: activeJobs.length,
      data: activeJobs
    });
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active jobs'
    });
  }
});

// @desc    Get all rental nodes
// @route   GET /api/jobs-display/rental-nodes
// @access  Public
router.get('/rental-nodes', async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      count: mockNodes.length,
      data: mockNodes
    });
  } catch (error) {
    console.error('Error fetching rental nodes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rental nodes'
    });
  }
});

// @desc    Get job and node statistics
// @route   GET /api/jobs-display/job-stats
// @access  Public
router.get('/job-stats', async (req, res) => {
  try {
    const totalJobs = mockJobs.length;
    const activeJobs = mockJobs.filter(job => 
      job.status === 'running' || job.status === 'accepted'
    ).length;
    
    const totalNodes = mockNodes.length;
    const availableNodes = mockNodes.filter(node => node.status === 'active').length;
    const busyNodes = mockNodes.filter(node => node.status === 'busy').length;
    
    const utilization = totalNodes > 0 ? Math.round((busyNodes / totalNodes) * 100) : 0;

    const stats = {
      jobs: {
        total: totalJobs,
        active: activeJobs,
        completed: totalJobs - activeJobs
      },
      nodes: {
        total: totalNodes,
        available: availableNodes,
        busy: busyNodes,
        utilization: utilization
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job statistics'
    });
  }
});

// @desc    Create SSH access for a job (when payment is confirmed)
// @route   POST /api/jobs-display/jobs/:jobId/ssh-access
// @access  Public (in real app, this should be protected)
router.post('/jobs/:jobId/ssh-access', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Find the job
    const jobIndex = mockJobs.findIndex(job => job.job_id === jobId);
    if (jobIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const job = mockJobs[jobIndex];
    if (job.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Job must be accepted before creating SSH access'
      });
    }

    // Generate SSH username
    const sshUsername = `job_${jobId.slice(-8)}`;
    
    // Update job
    mockJobs[jobIndex] = {
      ...job,
      ssh_username: sshUsername,
      ssh_info: `ssh ${sshUsername}@${job.node_ip}`,
      status: 'running'
    };

    res.status(200).json({
      success: true,
      data: {
        job_id: jobId,
        ssh_username: sshUsername,
        ssh_command: `ssh ${sshUsername}@${job.node_ip}`,
        node_ip: job.node_ip,
        message: 'SSH access created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating SSH access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SSH access'
    });
  }
});

// @desc    Remove SSH access for a job (when job ends)
// @route   DELETE /api/jobs-display/jobs/:jobId/ssh-access
// @access  Public (in real app, this should be protected)
router.delete('/jobs/:jobId/ssh-access', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Find the job
    const jobIndex = mockJobs.findIndex(job => job.job_id === jobId);
    if (jobIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const job = mockJobs[jobIndex];
    const removedSshUser = job.ssh_username;

    // Update job
    mockJobs[jobIndex] = {
      ...job,
      ssh_username: null,
      ssh_info: null,
      status: 'completed'
    };

    // Update corresponding node
    const nodeIndex = mockNodes.findIndex(node => node.node_id === job.node_id);
    if (nodeIndex !== -1) {
      mockNodes[nodeIndex] = {
        ...mockNodes[nodeIndex],
        status: 'active',
        current_job: null,
        ssh_user: null
      };
    }

    res.status(200).json({
      success: true,
      data: {
        job_id: jobId,
        removed_ssh_user: removedSshUser,
        message: 'SSH access removed successfully'
      }
    });
  } catch (error) {
    console.error('Error removing SSH access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove SSH access'
    });
  }
});

// @desc    Add a test job (for demonstration)
// @route   POST /api/jobs-display/test-job
// @access  Public
router.post('/test-job', async (req, res) => {
  try {
    const newJobId = `job_${Date.now().toString().slice(-8)}`;
    const availableNode = mockNodes.find(node => node.status === 'active');
    
    if (!availableNode) {
      return res.status(400).json({
        success: false,
        message: 'No available nodes'
      });
    }

    const newJob = {
      job_id: newJobId,
      client_id: `client_${Math.random().toString(36).substr(2, 6)}`,
      node_id: availableNode.node_id,
      node_ip: availableNode.ip_address,
      ssh_username: null,
      ssh_info: null,
      status: 'accepted',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      payment_amount: availableNode.pricing.hourly_rate
    };

    mockJobs.push(newJob);

    // Update node status
    const nodeIndex = mockNodes.findIndex(node => node.node_id === availableNode.node_id);
    mockNodes[nodeIndex].status = 'busy';
    mockNodes[nodeIndex].current_job = newJobId;

    res.status(201).json({
      success: true,
      data: newJob,
      message: 'Test job created successfully'
    });
  } catch (error) {
    console.error('Error creating test job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test job'
    });
  }
});

module.exports = router;
