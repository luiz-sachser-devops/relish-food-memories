const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['facilitator', 'participant', 'admin'],
      default: 'participant'
    },
    workshopId: {
      type: Schema.Types.ObjectId,
      ref: 'Workshop',
      default: null
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    refreshTokens: [
      {
        tokenHash: {
          type: String,
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        },
        expiresAt: {
          type: Date,
          required: true
        }
      }
    ],
    resetPasswordTokenHash: {
      type: String,
      default: null
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = model('User', userSchema);
