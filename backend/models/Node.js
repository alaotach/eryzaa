const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  nodeId: {
    type: String,
    required: true,
    unique: true
  },
  providerAddress: {
    type: String,
    required: true
  },
  nodeType: {
    type: String,
    required: true,
    enum: ['training', 'inference', 'ssh', 'edge']
  },
  specifications: {
    cpuCores: {
      type: Number,
      required: true
    },
    memoryGB: {
      type: Number,
      required: true
    },
    gpuCount: {
      type: Number,
      default: 0
    },
    gpuType: {
      type: String,
      default: ''
    },
    storageGB: {
      type: Number,
      required: true
    },
    networkSpeed: {
      type: String,
      default: ''
    }
  },
  pricing: {
    pricePerHour: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      default: 'ETZ'
    }
  },
  availability: {
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    uptime: {
      type: Number,
      default: 0
    }
  },
  performance: {
    totalJobs: {
      type: Number,
      default: 0
    },
    successfulJobs: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    reliability: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    }
  },
  location: {
    region: String,
    country: String,
    city: String
  },
  endpoint: {
    type: String,
    required: true
  },
  currentJob: {
    type: String,
    default: null
  },
  // Reputation and earnings
  reputation: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  totalEarnings: {
    type: String,
    default: '0'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
nodeSchema.index({ providerAddress: 1 });
nodeSchema.index({ nodeType: 1 });
nodeSchema.index({ 'availability.isOnline': 1 });
nodeSchema.index({ 'pricing.pricePerHour': 1 });

module.exports = mongoose.model('Node', nodeSchema);
