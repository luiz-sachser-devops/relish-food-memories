const express = require('express');
const Participant = require('../models/Participant');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const Workshop = require('../models/Workshop');

const router = express.Router();

router.get('/', authenticate, authorize('facilitator', 'admin'), async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === 'facilitator') {
      const workshops = await Workshop.find({ facilitatorId: req.user.id }).select('_id');
      const workshopIds = workshops.map((workshop) => workshop.id);
      filters.$or = [{ workshopId: { $in: workshopIds } }, { workshopId: null }];
    } else if (req.query.workshopId) {
      filters.workshopId = req.query.workshopId;
    }
    const participants = await Participant.find(filters).sort({ createdAt: -1 });
    res.json(participants);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('facilitator', 'admin'), async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.user.role === 'facilitator') {
      if (payload.workshopId) {
        const workshop = await Workshop.findOne({ _id: payload.workshopId, facilitatorId: req.user.id });
        payload.workshopId = workshop ? payload.workshopId : null;
      } else {
        payload.workshopId = req.user.workshopId || null;
      }
    }

    if (payload.userId) {
      const account = await User.findById(payload.userId).select('name email role');
      if (!account || account.role !== 'participant') {
        return res.status(404).json({ message: 'Participant account not found' });
      }
      payload.userId = account.id;
      payload.name = account.name;
      payload.email = account.email;

      const existing = await Participant.findOne({
        $or: [{ userId: account.id }, { email: account.email }]
      });
      if (existing) {
        if (!existing.userId) {
          existing.userId = account.id;
        }
        if (typeof payload.workshopId !== 'undefined') {
          existing.workshopId = payload.workshopId;
        }
        existing.name = payload.name;
        existing.email = payload.email;
        await existing.save();
        return res.json(existing);
      }
    }
    const participant = await Participant.create(payload);
    res.status(201).json(participant);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize('facilitator', 'admin'), async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.user.role === 'facilitator') {
      if (payload.workshopId) {
        const workshop = await Workshop.findOne({ _id: payload.workshopId, facilitatorId: req.user.id });
        payload.workshopId = workshop ? payload.workshopId : null;
      } else if (payload.workshopId === null) {
        payload.workshopId = null;
      } else {
        payload.workshopId = req.user.workshopId || null;
      }
    }
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    delete payload.userId;
    if (participant.userId) {
      delete payload.email;
    }

    Object.keys(payload).forEach((key) => {
      participant[key] = payload[key];
    });

    await participant.save();
    res.json(participant);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('facilitator', 'admin'), async (req, res, next) => {
  try {
    const participant = await Participant.findByIdAndDelete(req.params.id);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
