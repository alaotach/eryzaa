const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true
  },
  clientAddress: {
    type: String,
    required: true
  },
  providerAddress: {
    type: String,
    default: null
  },
  jobType: {
    type: String,
    required: true,
    enum: ['training', 'inference', 'ssh', 'edge']
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  totalCost: {
    type: String,
    required: true
  },
  estimatedDuration: {
    type: Number,
    required: true
  },
  actualDuration: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  inputDataHash: {
    type: String,
    required: true
  },
  configHash: {
    type: String,
    required: true
  },
  outputHash: {
    type: String,
    default: null
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: String,
    default: ''
  },
  // Quality and ratings
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  clientRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  providerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  // Error tracking
  errorLogs: [{
    timestamp: Date,
    error: String,
    phase: String
  }],
  // Blockchain transaction hashes
  transactionHashes: {
    creation: String,
    assignment: String,
    completion: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
jobSchema.index({ clientAddress: 1 });
jobSchema.index({ providerAddress: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
