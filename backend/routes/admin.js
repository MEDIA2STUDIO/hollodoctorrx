const express = require('express');
const db = require('../db');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/doctors', auth, requireAdmin, (req, res) => {
  const doctors = db.prepare(
    'SELECT id, name, email, specialization, regNo, hospitalName, role, createdAt FROM users ORDER BY createdAt DESC'
  ).all();
  res.json(doctors);
});

router.get('/activities', auth, requireAdmin, (req, res) => {
  const { userId, action, startDate, endDate, limit } = req.query;
  let sql = 'SELECT * FROM activity_log WHERE 1=1';
  const params = [];

  if (userId) { sql += ' AND userId = ?'; params.push(userId); }
  if (action) { sql += ' AND action = ?'; params.push(action); }
  if (startDate) { sql += ' AND createdAt >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND createdAt <= ?'; params.push(endDate); }

  sql += ' ORDER BY createdAt DESC';

  const maxLimit = Math.min(parseInt(limit) || 200, 1000);
  sql += ' LIMIT ?';
  params.push(maxLimit);

  const activities = db.prepare(sql).all(...params);
  res.json(activities.map(a => ({ ...a, details: JSON.parse(a.details || '{}') })));
});

router.get('/activities/:userId', auth, requireAdmin, (req, res) => {
  const activities = db.prepare(
    'SELECT * FROM activity_log WHERE userId = ? ORDER BY createdAt DESC LIMIT 200'
  ).all(req.params.userId);
  res.json(activities.map(a => ({ ...a, details: JSON.parse(a.details || '{}') })));
});

module.exports = router;
