const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Photo = require('../models/Photo');
const Participant = require('../models/Participant');
const { resolveStoragePath, getUploadRoot } = require('../utils/storage');

const router = express.Router();

const FILE_SIZE_LIMIT = Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, done) => {
    try {
      const { day, phaseIndex, moduleId } = req.body;
      if (!day || typeof day === 'undefined') {
        return done(new Error('Missing "day" field in request body'));
      }
      if (typeof phaseIndex === 'undefined') {
        return done(new Error('Missing "phaseIndex" field in request body'));
      }

      const { absoluteDir, relativeDir } = resolveStoragePath({
        day,
        phaseIndex,
        moduleId
      });

      req.storageContext = { relativeDir };
      done(null, absoluteDir);
    } catch (error) {
      done(error);
    }
  },
  filename: (req, file, done) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '-');
    const ext = path.extname(safeName) || '.jpg';
    done(null, `${timestamp}-${safeName}${ext ? '' : '.jpg'}`);
  }
});

const fileFilter = (req, file, done) => {
  if (!file.mimetype.startsWith('image/')) {
    return done(new Error('Only image uploads are allowed'));
  }
  done(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMIT
  }
});

router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.day) filters.day = Number(req.query.day);
    if (req.query.moduleId) filters.moduleId = req.query.moduleId;

    const photos = await Photo.find(filters)
      .populate('participantIds')
      .sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    next(error);
  }
});

router.post('/', upload.single('photo'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No photo uploaded' });
  }

  try {
    const {
      day,
      phaseIndex,
      moduleId,
      caption,
      notes,
      participantIds
    } = req.body;

    const parsedDay = Number(day);
    const parsedPhase = Number(phaseIndex);

    if (!Number.isInteger(parsedDay)) {
      return res.status(400).json({ message: 'Invalid day value' });
    }
    if (!Number.isInteger(parsedPhase)) {
      return res.status(400).json({ message: 'Invalid phaseIndex value' });
    }

    let participants = [];
    if (participantIds) {
      const ids = Array.isArray(participantIds)
        ? participantIds
        : String(participantIds)
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);

      const foundParticipants = await Participant.find({ _id: { $in: ids } });
      participants = foundParticipants.map((participant) => participant.id);
    }

    const storagePath = path.join(getUploadRoot(), req.storageContext.relativeDir, req.file.filename);

    const photo = await Photo.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      storagePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      day: parsedDay,
      phaseIndex: parsedPhase,
      moduleId,
      caption,
      notes,
      participantIds: participants
    });

    const populatedPhoto = await photo.populate('participantIds');

    res.status(201).json(populatedPhoto);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const absolutePath = path.join(process.cwd(), photo.storagePath);
    fs.promises
      .unlink(absolutePath)
      .catch((error) => {
        if (error.code !== 'ENOENT') {
          console.warn(`Failed to remove photo file at ${absolutePath}:`, error.message);
        }
      });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
