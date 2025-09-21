const Job = require('../models/Job');

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private
const getJobs = async (req, res) => {
  try {
    const {
      status,
      jobType,
      clientAddress,
      providerAddress,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (jobType) query.jobType = jobType;
    if (clientAddress) query.clientAddress = clientAddress;
    if (providerAddress) query.providerAddress = providerAddress;

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private
const getJob = async (req, res) => {
  try {
    const job = await Job.findOne({ jobId: req.params.id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private
const createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      clientAddress: req.user.walletAddress || req.user.email
    };

    const job = await Job.create(jobData);

    res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private
const updateJob = async (req, res) => {
  try {
    let job = await Job.findOne({ jobId: req.params.id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Make sure user is job owner or provider
    if (job.clientAddress !== (req.user.walletAddress || req.user.email) && 
        job.providerAddress !== (req.user.walletAddress || req.user.email)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    job = await Job.findOneAndUpdate(
      { jobId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOne({ jobId: req.params.id });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Make sure user is job owner
    if (job.clientAddress !== (req.user.walletAddress || req.user.email)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }

    await Job.findOneAndDelete({ jobId: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's jobs (as client)
// @route   GET /api/jobs/my-jobs
// @access  Private
const getMyJobs = async (req, res) => {
  try {
    const userAddress = req.user.walletAddress || req.user.email;
    
    const jobs = await Job.find({ clientAddress: userAddress })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get jobs assigned to provider
// @route   GET /api/jobs/provider-jobs
// @access  Private
const getProviderJobs = async (req, res) => {
  try {
    const userAddress = req.user.walletAddress || req.user.email;
    
    const jobs = await Job.find({ providerAddress: userAddress })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  getProviderJobs
};
