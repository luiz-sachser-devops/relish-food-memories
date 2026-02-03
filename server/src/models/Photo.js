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
    uploadedBy: {
      type: Types.ObjectId,
      ref: 'User'
    },
    caption: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    workshopId: {
      type: Types.ObjectId,
      ref: 'Workshop'
    }
  },
  {
    timestamps: true
  }
);

photoSchema.virtual('fileUrl').get(function fileUrl() {
  if (!this.id) return null;
  return `/api/photos/${this.id}/file`;
});

photoSchema.set('toJSON', { virtuals: true });
photoSchema.set('toObject', { virtuals: true });

module.exports = model('Photo', photoSchema);
