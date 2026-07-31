const User = require('../models/User');

// @desc    Sync user from Firebase to MongoDB
// @route   POST /api/users/sync
// @access  Private
const syncUser = async (req, res) => {
  try {
    const { uid, name, email } = req.user; // From auth middleware
    
    // Check if user exists
    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      // Create user if not exists
      user = await User.create({
        firebaseUid: uid,
        name: name || req.body.name || 'Anonymous User', 
        email: email || req.body.email,
      });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { syncUser };
