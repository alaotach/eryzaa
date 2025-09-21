const express = require('express');
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  getProviderJobs
} = require('../controllers/jobController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getJobs)
  .post(protect, createJob);

router.get('/my-jobs', protect, getMyJobs);
router.get('/provider-jobs', protect, getProviderJobs);

router.route('/:id')
  .get(protect, getJob)
  .put(protect, updateJob)
  .delete(protect, deleteJob);

module.exports = router;
