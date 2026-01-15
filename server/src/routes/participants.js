const express = require('express');
const Participant = require('../models/Participant');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const participants = await Participant.find().sort({ createdAt: -1 });
    res.json(participants);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const participant = await Participant.create(req.body);
    res.status(201).json(participant);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const participant = await Participant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    res.json(participant);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
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
