const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post('/register', async (req, res) => {
  const { name, email, password, specialization, regNo, hospitalName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = await db.prepare(
    'INSERT INTO users (name, email, password, specialization, regNo, hospitalName, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, email, hashed, specialization || '', regNo || '', hospitalName || '', 'doctor');

  const token = jwt.sign(
    { id: result.lastInsertRowid, name, email, role: 'doctor' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      id: result.lastInsertRowid, name, email,
      specialization: specialization || '',
      regNo: regNo || '',
      hospitalName: hospitalName || '',
      role: 'doctor',
    }
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  await db.logActivity(user.id, user.name, 'login', { email: user.email });
  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      specialization: user.specialization,
      regNo: user.regNo || '',
      hospitalName: user.hospitalName || '',
      role: user.role || 'doctor',
    }
  });
});

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
  await db.prepare(
    'INSERT INTO otp_codes (email, code, expiresAt) VALUES (?, ?, ?)'
  ).run(email, otp, expiresAt);

  if (RESEND_API_KEY) {
    const { Resend } = require('resend');
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: 'Hello Doctor <onboarding@resend.dev>',
      to: email,
      subject: 'Your Login OTP - Hello Doctor',
      html: `<div style="font-family:sans-serif;padding:24px;max-width:480px;margin:auto">
        <h2 style="color:#2c3e50">Hello Doctor</h2>
        <p>Your one-time password:</p>
        <div style="font-size:32px;letter-spacing:8px;text-align:center;padding:16px;background:#f8f9fa;border-radius:8px;font-weight:bold">${otp}</div>
        <p style="color:#7f8c8d;font-size:14px">This code expires in 10 minutes.</p>
      </div>`,
    });
  } else {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
  }

  res.json({ message: 'OTP sent to your email', devOtp: RESEND_API_KEY ? undefined : otp });
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp, name, specialization, regNo, hospitalName } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  const record = await db.prepare(
    'SELECT * FROM otp_codes WHERE email = ? AND code = ? ORDER BY id DESC LIMIT 1'
  ).get(email, otp);

  if (!record) return res.status(400).json({ error: 'Invalid OTP' });

  const now = new Date().toISOString();
  if (record.expiresAt < now) {
    await db.prepare('DELETE FROM otp_codes WHERE id = ?').run(record.id);
    return res.status(400).json({ error: 'OTP expired' });
  }

  await db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);

  let user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const displayName = name || email.split('@')[0];
    const hashed = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);
    const result = await db.prepare(
      'INSERT INTO users (name, email, password, specialization, regNo, hospitalName, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(displayName, email, hashed, specialization || '', regNo || '', hospitalName || '', 'doctor');
    user = await db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  await db.logActivity(user.id, user.name, 'login', { email: user.email, method: 'otp' });

  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      specialization: user.specialization || '',
      regNo: user.regNo || '',
      hospitalName: user.hospitalName || '',
      role: user.role || 'doctor',
    }
  });
});

router.get('/me', auth, async (req, res) => {
  const user = await db.prepare('SELECT id, name, email, specialization, regNo, hospitalName, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, regNo: user.regNo || '', hospitalName: user.hospitalName || '', role: user.role || 'doctor' });
});

module.exports = router;
