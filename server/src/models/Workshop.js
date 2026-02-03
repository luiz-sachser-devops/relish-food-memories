const { Schema, model, Types } = require('mongoose');

const workshopSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    facilitatorId: {
      type: Types.ObjectId,
      ref: 'User',
      default: null
    },
    archivedAt: {
      type: Date,
      default: null
    },
    archivedBy: {
      type: Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = model('Workshop', workshopSchema);