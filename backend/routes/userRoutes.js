const express = require('express');
const router = express.Router();
const { syncUser, getProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/sync', protect, syncUser);
router.get('/profile', protect, getProfile);

module.exports = router;
