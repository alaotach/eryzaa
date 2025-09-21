const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  connectWallet,
  getUserByWallet
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/connect-wallet', protect, connectWallet);
router.get('/user/:walletAddress', getUserByWallet);

module.exports = router;
