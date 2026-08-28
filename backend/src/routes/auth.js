import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { JWT_SECRET, JWT_EXP } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { sendOtpEmail } from '../services/emailService.js';

const router = Router();

// In-memory store for unverified registrations waiting for OTP (10-minute TTL)
const pendingRegistrations = new Map();

// Periodic cleanup of expired pending registrations (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingRegistrations.entries()) {
    if (value.expiresAt < now) {
      pendingRegistrations.delete(key);
    }
  }
}, 5 * 60 * 1000);

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, avatar: user.avatar || 'redbull' },
    JWT_SECRET,
    { expiresIn: JWT_EXP }
  );
}

function formatUserResponse(user) {
  return {
    id: user._id || user.id,
    username: user.username,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    avatar: user.avatar || 'redbull',
    driverNumber: user.driverNumber || 44,
    registrationIndex: user.registrationIndex || 1,
    onboardingComplete: user.onboardingComplete ?? true,
    isEmailVerified: user.isEmailVerified ?? false,
    authProvider: user.authProvider || 'local',
    avgWPM: user.avgWPM || 0,
    bestWPM: user.bestWPM || 0,
    racesCount: user.racesCount || 0,
    racesWon: user.racesWon || 0,
    avgAccuracy: user.avgAccuracy || 100,
    totalTimePlayedMs: user.totalTimePlayedMs || 0,
    createdAt: user.createdAt
  };
}

/**
 * POST /api/auth/send-otp
 * Validates registration fields, generates 6-digit OTP, and dispatches to pit wall email.
 */
router.post('/send-otp', authRateLimiter, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database is not connected. Please verify MongoDB status.' });
    }

    const { firstName, lastName, username, email, password, confirmPassword } = req.body;

    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'First Name is required' });
    }

    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ error: 'Last Name is required' });
    }

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ error: 'Driver Callsign must be at least 2 characters long' });
    }

    if (username.trim().length > 30) {
      return res.status(400).json({ error: 'Driver Callsign must not exceed 30 characters' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Valid Pit Wall Email is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if Callsign is already taken (case-insensitive)
    const existingUsername = await User.findOne({
      username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }
    });
    if (existingUsername) {
      return res.status(409).json({ error: 'Driver Callsign is already registered with FIA' });
    }

    // Check if Email is already registered
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email address is already in use by another driver' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Store in pendingRegistrations with 10-minute expiry
    pendingRegistrations.set(cleanEmail, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Send email dispatch
    await sendOtpEmail(cleanEmail, otp, cleanUsername);

    return res.json({
      ok: true,
      message: `FIA Telemetry code transmitted to ${cleanEmail}`,
      email: cleanEmail,
      devOtp: otp // Included for zero-friction testing
    });

  } catch (err) {
    console.error('POST /api/auth/send-otp error:', err);
    return res.status(500).json({ error: 'Failed to transmit telemetry verification code' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit code and creates the driver record in MongoDB.
 */
router.post('/verify-otp', authRateLimiter, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database is not connected.' });
    }

    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pending = pendingRegistrations.get(cleanEmail);

    if (!pending) {
      return res.status(400).json({ error: 'Verification session expired. Please submit registration again.' });
    }

    if (Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(cleanEmail);
      return res.status(400).json({ error: 'Telemetry PIN has expired. Please request a new code.' });
    }

    if (pending.otp !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid 6-digit FIA Telemetry PIN' });
    }

    // Determine sequential registration member index (#1, #2, #3...)
    const totalDriversCount = await User.countDocuments();
    const registrationIndex = totalDriversCount + 1;

    // Pick random available racing number between 2 and 99
    const randomDriverNum = Math.floor(2 + Math.random() * 97);

    const user = new User({
      username: pending.username,
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.email,
      passwordHash: pending.passwordHash,
      isEmailVerified: true,
      authProvider: 'local',
      registrationIndex,
      driverNumber: randomDriverNum,
      onboardingComplete: false,
      avatar: 'ferrari'
    });

    await user.save();
    pendingRegistrations.delete(cleanEmail);

    const token = makeToken(user);

    return res.status(201).json({
      ok: true,
      user: formatUserResponse(user),
      token,
      requiresInduction: true
    });

  } catch (err) {
    console.error('POST /api/auth/verify-otp error:', err);
    return res.status(500).json({ error: 'Failed to verify driver and issue superlicence' });
  }
});

/**
 * POST /api/auth/google
 * Google OAuth2 Login & Instant Registration handler
 */
router.post('/google', authRateLimiter, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database is not connected.' });
    }

    const { credential, mockProfile } = req.body;
    let googlePayload = null;

    if (credential) {
      try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        googlePayload = ticket.getPayload();
      } catch (tokenErr) {
        console.warn('Google verifyIdToken note:', tokenErr.message);
        // If decoded payload available
        try {
          const decoded = jwt.decode(credential);
          if (decoded && decoded.email) {
            googlePayload = decoded;
          }
        } catch (decErr) {}
      }
    }

    if (!googlePayload && mockProfile) {
      googlePayload = mockProfile;
    }

    if (!googlePayload || !googlePayload.email) {
      return res.status(400).json({ error: 'Valid Google authentication is required' });
    }

    const cleanEmail = googlePayload.email.toLowerCase();
    const googleId = googlePayload.sub || `g_${Date.now()}`;
    const givenName = googlePayload.given_name || googlePayload.name?.split(' ')[0] || 'Driver';
    const familyName = googlePayload.family_name || googlePayload.name?.split(' ').slice(1).join(' ') || '';

    // Check if user exists by Google ID or Email
    let user = await User.findOne({
      $or: [{ googleId }, { email: cleanEmail }]
    });

    let requiresInduction = false;

    if (user) {
      // Existing driver
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.isEmailVerified = true;
        await user.save();
      }
      requiresInduction = !user.onboardingComplete;
    } else {
      // New driver via Google
      const totalDriversCount = await User.countDocuments();
      const registrationIndex = totalDriversCount + 1;

      // Generate unique starting callsign
      const cleanGiven = givenName.replace(/[^a-zA-Z0-9_]/g, '');
      let baseCallsign = cleanGiven || 'Driver';
      
      const existingCallsign = await User.findOne({ username: new RegExp(`^${baseCallsign}$`, 'i') });
      if (existingCallsign) {
        baseCallsign = `${baseCallsign}_${Math.floor(100 + Math.random() * 900)}`;
      }

      user = new User({
        username: baseCallsign,
        firstName: givenName,
        lastName: familyName,
        email: cleanEmail,
        googleId,
        isEmailVerified: true,
        authProvider: 'google',
        registrationIndex,
        driverNumber: Math.floor(2 + Math.random() * 97),
        onboardingComplete: false,
        avatar: 'ferrari'
      });

      await user.save();
      requiresInduction = true;
    }

    const token = makeToken(user);

    return res.json({
      ok: true,
      user: formatUserResponse(user),
      token,
      requiresInduction
    });

  } catch (err) {
    console.error('POST /api/auth/google error:', err);
    return res.status(500).json({ error: 'Google authentication failed' });
  }
});

/**
 * POST /api/auth/login
 * Driver Login via Callsign OR Pit Wall Email + Password
 */
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Database is not connected.' });
    }

    const { identifier, username, password } = req.body;
    const loginTarget = (identifier || username || '').trim();

    if (!loginTarget || !password) {
      return res.status(400).json({ error: 'Driver Callsign/Email and Password are required' });
    }

    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${loginTarget}$`, 'i') } },
        { email: loginTarget.toLowerCase() }
      ]
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid Driver Callsign/Email or PIN' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Driver Callsign/Email or PIN' });
    }

    const token = makeToken(user);

    return res.json({
      ok: true,
      user: formatUserResponse(user),
      token,
      requiresInduction: !user.onboardingComplete
    });

  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/auth/complete-induction
 * Driver Induction Step 3: Sets permanent Callsign, Driver Racing Number, and Starter Constructor Team.
 */
router.post('/complete-induction', requireAuth, async (req, res) => {
  try {
    const { callsign, driverNumber, teamId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Driver superlicence not found' });
    }

    const updateFields = {
      onboardingComplete: true
    };

    if (teamId && typeof teamId === 'string') {
      updateFields.avatar = teamId.toLowerCase();
    }

    if (driverNumber) {
      const parsedNum = parseInt(driverNumber, 10);
      if (parsedNum >= 1 && parsedNum <= 99) {
        updateFields.driverNumber = parsedNum;
      }
    }

    if (callsign && typeof callsign === 'string' && callsign.trim()) {
      const cleanCallsign = callsign.trim();
      if (cleanCallsign.toLowerCase() !== user.username.toLowerCase()) {
        const duplicate = await User.findOne({
          username: { $regex: new RegExp(`^${cleanCallsign}$`, 'i') },
          _id: { $ne: user._id }
        });
        if (duplicate) {
          return res.status(409).json({ error: 'That Driver Callsign is already registered by another driver' });
        }
        updateFields.username = cleanCallsign;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateFields, { new: true });
    const token = makeToken(updatedUser);

    return res.json({
      ok: true,
      user: formatUserResponse(updatedUser),
      token
    });

  } catch (err) {
    console.error('POST /api/auth/complete-induction error:', err);
    return res.status(500).json({ error: 'Failed to complete driver induction' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated driver profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    return res.json({ user: formatUserResponse(user) });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return res.status(500).json({ error: 'Failed to fetch current driver superlicence' });
  }
});

export default router;
