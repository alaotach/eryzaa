const Node = require('../models/Node');

// @desc    Get all nodes
// @route   GET /api/nodes
// @access  Private
const getNodes = async (req, res) => {
  try {
    const {
      nodeType,
      isOnline,
      providerAddress,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};
    
    if (nodeType) query.nodeType = nodeType;
    if (isOnline !== undefined) query['availability.isOnline'] = isOnline === 'true';
    if (providerAddress) query.providerAddress = providerAddress;

    const nodes = await Node.find(query)
      .sort({ 'availability.lastSeen': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Node.countDocuments(query);

    res.status(200).json({
      success: true,
      count: nodes.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: nodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single node
// @route   GET /api/nodes/:id
// @access  Private
const getNode = async (req, res) => {
  try {
    const node = await Node.findOne({ nodeId: req.params.id });

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }

    res.status(200).json({
      success: true,
      data: node
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register new node
// @route   POST /api/nodes
// @access  Private
const registerNode = async (req, res) => {
  try {
    const nodeData = {
      ...req.body,
      providerAddress: req.user.walletAddress || req.user.email
    };

    const node = await Node.create(nodeData);

    // Update user's node list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { nodeIds: node.nodeId }
    });

    res.status(201).json({
      success: true,
      data: node
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update node
// @route   PUT /api/nodes/:id
// @access  Private
const updateNode = async (req, res) => {
  try {
    let node = await Node.findOne({ nodeId: req.params.id });

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }

    // Make sure user is node owner
    if (node.providerAddress !== (req.user.walletAddress || req.user.email)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this node'
      });
    }

    node = await Node.findOneAndUpdate(
      { nodeId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: node
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete node
// @route   DELETE /api/nodes/:id
// @access  Private
const deleteNode = async (req, res) => {
  try {
    const node = await Node.findOne({ nodeId: req.params.id });

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }

    // Make sure user is node owner
    if (node.providerAddress !== (req.user.walletAddress || req.user.email)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this node'
      });
    }

    await Node.findOneAndDelete({ nodeId: req.params.id });

    // Remove from user's node list
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { nodeIds: req.params.id }
    });

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

// @desc    Get user's nodes
// @route   GET /api/nodes/my-nodes
// @access  Private
const getMyNodes = async (req, res) => {
  try {
    const userAddress = req.user.walletAddress || req.user.email;
    
    const nodes = await Node.find({ providerAddress: userAddress })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: nodes.length,
      data: nodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update node status (online/offline)
// @route   PUT /api/nodes/:id/status
// @access  Private
const updateNodeStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    let node = await Node.findOne({ nodeId: req.params.id });

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Node not found'
      });
    }

    // Make sure user is node owner
    if (node.providerAddress !== (req.user.walletAddress || req.user.email)) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this node'
      });
    }

    node = await Node.findOneAndUpdate(
      { nodeId: req.params.id },
      {
        'availability.isOnline': isOnline,
        'availability.lastSeen': new Date()
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: node
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getNodes,
  getNode,
  registerNode,
  updateNode,
  deleteNode,
  getMyNodes,
  updateNodeStatus
};
