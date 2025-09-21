const express = require('express');
const {
  getNodes,
  getNode,
  registerNode,
  updateNode,
  deleteNode,
  getMyNodes,
  updateNodeStatus
} = require('../controllers/nodeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getNodes)
  .post(protect, registerNode);

router.get('/my-nodes', protect, getMyNodes);

router.route('/:id')
  .get(protect, getNode)
  .put(protect, updateNode)
  .delete(protect, deleteNode);

router.put('/:id/status', protect, updateNodeStatus);

module.exports = router;
