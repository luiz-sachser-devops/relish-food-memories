const express = require('express');
const fs = require('fs/promises');
const Workshop = require('../models/Workshop');
const Participant = require('../models/Participant');
const { authenticate, authorize } = require('../middleware/auth');
const Photo = require('../models/Photo');
const { getAbsoluteUploadPath } = require('../utils/storage');

const router = express.Router();

const removeFileIfExists = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

router.get('/', authenticate, authorize('facilitator', 'admin'), async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === 'facilitator') {
      filters.facilitatorId = req.user.id;
      filters.archivedAt = null;
    }

    const workshops = await Workshop.find(filters)
      .populate('facilitatorId', 'name email')
      .sort({ createdAt: -1 });
    res.json(workshops);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('admin', 'facilitator'), async (req, res, next) => {
  try {
    const { name, facilitatorId } = req.body || {};
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const finalFacilitatorId = req.user.role === 'facilitator' ? req.user.id : (facilitatorId || null);

    const workshop = await Workshop.create({
      name: String(name).trim(),
      facilitatorId: finalFacilitatorId
    });
    const populated = await workshop.populate('facilitatorId', 'name email');
    return res.status(201).json(populated);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', authenticate, authorize('admin', 'facilitator'), async (req, res, next) => {
  try {
    const { name, facilitatorId } = req.body || {};
    if (!name && !facilitatorId) {
      return res.status(400).json({ message: 'Name or facilitatorId is required' });
    }

    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found' });
    }

    if (req.user.role === 'facilitator' && String(workshop.facilitatorId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) {
      workshop.name = String(name).trim();
    }
    if (typeof facilitatorId !== 'undefined') {
      workshop.facilitatorId = facilitatorId || null;
    }
    await workshop.save();
    const populated = await workshop.populate('facilitatorId', 'name email');
    return res.json(populated);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authenticate, authorize('admin', 'facilitator'), async (req, res, next) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found' });
    }

    if (req.user.role === 'facilitator') {
      if (String(workshop.facilitatorId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!workshop.archivedAt) {
        workshop.archivedAt = new Date();
        workshop.archivedBy = req.user.id;
        await workshop.save();
      }

      await Participant.updateMany({ workshopId: workshop.id }, { $set: { workshopId: null } });

      const populated = await workshop.populate('facilitatorId', 'name email');
      return res.json(populated);
    }

    const photos = await Photo.find({ workshopId: workshop.id });
    await Photo.deleteMany({ workshopId: workshop.id });

    await workshop.deleteOne();

    await Promise.all(
      photos.map((photo) => removeFileIfExists(getAbsoluteUploadPath(photo.storagePath)))
    );

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;