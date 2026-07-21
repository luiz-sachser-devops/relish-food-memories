const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const multer = require('multer');
const path = require('path');
const Photo = require('../models/Photo');
const Participant = require('../models/Participant');
const { getAbsoluteUploadPath, resolveStoragePath } = require('../utils/storage');
const { authenticate } = require('../middleware/auth');
const Workshop = require('../models/Workshop');

const router = express.Router();

const FILE_SIZE_LIMIT = Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 10 * 1024 * 1024;

const storage = multer.memoryStorage();

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

const buildPhotoFilePath = (storagePath) => getAbsoluteUploadPath(storagePath);

const removeFileIfExists = async (filePath) => {
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

router.get('/', authenticate, async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.day) filters.day = Number(req.query.day);
    if (req.query.moduleId) filters.moduleId = req.query.moduleId;

    if (req.user?.role === 'participant') {
      filters.uploadedBy = req.user.id;
      if (req.user.workshopId) {
        filters.workshopId = req.user.workshopId;
      }
    } else if (req.user?.role === 'facilitator') {
      const workshops = await Workshop.find({ facilitatorId: req.user.id }).select('_id');
      const workshopIds = workshops.map((workshop) => workshop.id);
      if (req.query.workshopId) {
        const allowed = workshopIds.some((id) => String(id) === String(req.query.workshopId));
        if (allowed) {
          filters.workshopId = req.query.workshopId;
        } else {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else {
        filters.workshopId = { $in: workshopIds };
      }
    } else if (req.query.workshopId) {
      filters.workshopId = req.query.workshopId;
    }

    const query = Photo.find(filters).sort({ createdAt: -1 });
    if (req.user?.role !== 'participant') {
      query.populate('participantIds').populate('uploadedBy', 'name role workshopId');
    }

    const photos = await query;
    const responsePayload = req.user?.role === 'participant'
      ? photos.map((photo) => {
          const json = photo.toJSON();
          delete json.participantIds;
          delete json.uploadedBy;
          return json;
        })
      : photos;
    res.json(responsePayload);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, upload.single('photo'), async (req, res, next) => {
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

    if (!day || typeof day === 'undefined') {
      return res.status(400).json({ message: 'Missing "day" field in request body' });
    }
    if (typeof phaseIndex === 'undefined') {
      return res.status(400).json({ message: 'Missing "phaseIndex" field in request body' });
    }

    const { relativeDir, absoluteDir } = resolveStoragePath({ day, phaseIndex, moduleId });
    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/\s+/g, '-');
    const ext = path.extname(safeName) || '.jpg';
    const filename = `${timestamp}-${safeName}${ext ? '' : '.jpg'}`;
    const storagePath = `${relativeDir}/${filename}`;
    const absoluteFilePath = path.join(absoluteDir, filename);

    await fsp.writeFile(absoluteFilePath, req.file.buffer);

    let workshopId = null;
    if (req.user?.role === 'facilitator') {
      if (req.body.workshopId) {
        const workshop = await Workshop.findOne({ _id: req.body.workshopId, facilitatorId: req.user.id });
        workshopId = workshop ? req.body.workshopId : null;
      } else if (req.user.workshopId) {
        workshopId = req.user.workshopId;
      } else {
        const workshop = await Workshop.findOne({ facilitatorId: req.user.id });
        workshopId = workshop?.id || null;
      }
    } else {
      workshopId = req.user?.workshopId || null;
    }

    const photo = await Photo.create({
      filename,
      originalName: req.file.originalname,
      storagePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      day: parsedDay,
      phaseIndex: parsedPhase,
      moduleId,
      caption,
      notes,
      participantIds: participants,
      uploadedBy: req.user.id,
      workshopId
    });

    if (req.user?.role !== 'participant') {
      const populatedPhoto = await photo.populate([
        { path: 'participantIds' },
        { path: 'uploadedBy', select: 'name role workshopId' }
      ]);
      return res.status(201).json(populatedPhoto);
    }

    const responsePayload = photo.toJSON();
    delete responsePayload.participantIds;
    return res.status(201).json(responsePayload);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/file', authenticate, async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    if (req.user?.role === 'participant') {
      if (!photo.uploadedBy || photo.uploadedBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user?.role === 'facilitator') {
      if (!photo.workshopId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const workshops = await Workshop.find({ facilitatorId: req.user.id }).select('_id');
      const workshopIds = workshops.map((workshop) => String(workshop.id));
      if (!workshopIds.includes(String(photo.workshopId))) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.setHeader('Content-Type', photo.mimeType || 'application/octet-stream');
    const filePath = buildPhotoFilePath(photo.storagePath);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (error) => {
      if (error.code === 'ENOENT') {
        res.status(404).json({ message: 'Photo not found' });
        return;
      }
      next(error);
    });
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    if (req.user?.role === 'participant') {
      if (!photo.uploadedBy || photo.uploadedBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user?.role === 'facilitator') {
      if (!photo.workshopId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const workshops = await Workshop.find({ facilitatorId: req.user.id }).select('_id');
      const workshopIds = workshops.map((workshop) => String(workshop.id));
      if (!workshopIds.includes(String(photo.workshopId))) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    await photo.deleteOne();
    await removeFileIfExists(buildPhotoFilePath(photo.storagePath));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
