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
    }
  },
  {
    timestamps: true
  }
);

module.exports = model('Participant', participantSchema);
