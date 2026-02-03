const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Workshop = require('../models/Workshop');

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRES || '1h';
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 7;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 30;

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: Boolean(user.emailVerified),
  lastLoginAt: user.lastLoginAt
});

const signAccessToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      role: user.role,
      workshopId: user.role === 'admin' ? null : user.workshopId || null
    },
    ACCESS_TOKEN_SECRET,
    { subject: user.id, expiresIn: ACCESS_TOKEN_TTL }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { tokenType: 'refresh' },
    REFRESH_TOKEN_SECRET,
    { subject: user.id, expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` }
  );

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const ensureWorkshopForFacilitator = async (user) => {
  if (!user || user.role !== 'facilitator') return user;
  if (user.workshopId) return user;

  const workshop = await Workshop.create({
    name: `${user.name}'s Workshop`,
    facilitatorId: user.id
  });
  user.workshopId = workshop.id;
  await user.save();
  return user;
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
};

router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('password').isString().matches(PASSWORD_RULES).withMessage('Password does not meet complexity requirements'),
    body('role').optional().isIn(['facilitator', 'participant']).withMessage('Invalid role')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: role || 'participant'
      });

      await ensureWorkshopForFacilitator(user);

      const refreshToken = signRefreshToken(user);
      const accessToken = signAccessToken(user);
      const refreshEntry = {
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
      };
      user.refreshTokens.push(refreshEntry);
      user.lastLoginAt = new Date();
      await user.save();

      setRefreshCookie(res, refreshToken);
      return res.status(201).json({
        accessToken,
        user: sanitizeUser(user)
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('password').isString().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.role === 'admin' && user.workshopId) {
        user.workshopId = null;
      }

      await ensureWorkshopForFacilitator(user);

      const refreshToken = signRefreshToken(user);
      const accessToken = signAccessToken(user);

      user.refreshTokens = user.refreshTokens.filter((entry) => entry.expiresAt > new Date());
      user.refreshTokens.push({
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
      });
      user.lastLoginAt = new Date();
      await user.save();

      setRefreshCookie(res, refreshToken);
      return res.json({ accessToken, user: sanitizeUser(user) });
    } catch (error) {
      return next(error);
    }
  }
);

router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (user.role === 'admin' && user.workshopId) {
      user.workshopId = null;
    }

    const tokenHash = hashToken(token);
    const matchingEntry = user.refreshTokens.find((entry) => entry.tokenHash === tokenHash);
    if (!matchingEntry || matchingEntry.expiresAt < new Date()) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);

    const newRefreshToken = signRefreshToken(user);
    user.refreshTokens.push({
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
    });
    await user.save();

    const accessToken = signAccessToken(user);
    setRefreshCookie(res, newRefreshToken);

    return res.json({ accessToken, user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
        const user = await User.findById(payload.sub);
        if (user) {
          const tokenHash = hashToken(token);
          user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
          await user.save();
        }
      } catch (error) {
        // ignore invalid token
      }
    }
    clearRefreshCookie(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').trim().isEmail().withMessage('Valid email required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.json({ message: 'If an account exists, a reset link will be provided.' });
      }

      const resetToken = crypto.randomBytes(24).toString('hex');
      user.resetPasswordTokenHash = hashToken(resetToken);
      user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
      await user.save();

      const responsePayload = {
        message: 'If an account exists, a reset link will be provided.'
      };

      if (process.env.NODE_ENV !== 'production') {
        responsePayload.resetToken = resetToken;
      }

      return res.json(responsePayload);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('token').trim().isLength({ min: 8 }).withMessage('Reset token required'),
    body('password').isString().matches(PASSWORD_RULES).withMessage('Password does not meet complexity requirements')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { email, token, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.resetPasswordTokenHash || !user.resetPasswordExpiresAt) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      if (user.resetPasswordExpiresAt < new Date()) {
        return res.status(400).json({ message: 'Reset token expired' });
      }

      const tokenHash = hashToken(token);
      if (tokenHash !== user.resetPasswordTokenHash) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      user.passwordHash = await bcrypt.hash(password, 12);
      user.resetPasswordTokenHash = null;
      user.resetPasswordExpiresAt = null;
      user.refreshTokens = [];
      await user.save();

      clearRefreshCookie(res);
      return res.json({ message: 'Password updated successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

router.get('/me', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
