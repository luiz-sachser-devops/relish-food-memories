const { Schema, model, Types } = require('mongoose');

const photoSchema = new Schema(
  {
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    storagePath: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    day: {
      type: Number,
      min: 1,
      max: 2,
      required: true
    },
    phaseIndex: {
      type: Number,
      min: 0,
      required: true
    },
    moduleId: {
      type: String,
      trim: true
    },
    participantIds: [
      {
        type: Types.ObjectId,
        ref: 'Participant'
      }
    ],
    caption: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = model('Photo', photoSchema);
