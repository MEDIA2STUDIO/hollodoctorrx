const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password, specialization, regNo, hospitalName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, specialization, regNo, hospitalName) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, hashed, specialization || '', regNo || '', hospitalName || '');

  const token = jwt.sign(
    { id: result.lastInsertRowid, name, email },
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
    }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      specialization: user.specialization,
      regNo: user.regNo || '',
      hospitalName: user.hospitalName || '',
    }
  });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, specialization, regNo, hospitalName FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, regNo: user.regNo || '', hospitalName: user.hospitalName || '' });
});

module.exports = router;
