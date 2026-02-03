const express = require('express');
const User = require('../models/User');
const Participant = require('../models/Participant');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'facilitator'), async (req, res, next) => {
  try {
    const role = req.query.role;
    if (req.user.role === 'facilitator' && role && role !== 'participant') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const filter = role ? { role } : {};
    if (req.user.role === 'facilitator' && !role) {
      filter.role = 'participant';
    }

    if (role === 'participant') {
      const participants = await Participant.find({})
        .select('userId email')
        .lean();
      const linkedUserIds = participants
        .map((participant) => participant.userId)
        .filter(Boolean);
      const linkedEmails = participants
        .map((participant) => participant.email)
        .filter(Boolean);

      if (linkedUserIds.length > 0) {
        filter._id = { $nin: linkedUserIds };
      }
      if (linkedEmails.length > 0) {
        filter.email = { $nin: linkedEmails };
      }
    }
    const users = await User.find(filter)
      .select('name email role workshopId createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

module.exports = router;