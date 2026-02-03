const { Schema, model } = require('mongoose');

const participantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    dietary: {
      type: String,
      trim: true
    },
    cultural: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    workshopId: {
      type: Schema.Types.ObjectId,
      ref: 'Workshop',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = model('Participant', participantSchema);
