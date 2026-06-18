const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const medicines = db.prepare(
    'SELECT * FROM medicines WHERE userId = ? ORDER BY createdAt DESC'
  ).all(req.user.id);
  res.json(medicines);
});

router.get('/:id', auth, (req, res) => {
  const medicine = db.prepare(
    'SELECT * FROM medicines WHERE id = ? AND userId = ?'
  ).get(req.params.id, req.user.id);
  if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
  res.json(medicine);
});

router.post('/', auth, (req, res) => {
  const { name, category, manufacturer, description, sideEffects, dosageForm } = req.body;
  if (!name) return res.status(400).json({ error: 'Medicine name is required' });

  const result = db.prepare(
    `INSERT INTO medicines (userId, name, category, manufacturer, description, sideEffects, dosageForm)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, name, category || '', manufacturer || '', description || '', sideEffects || '', dosageForm || '');

  const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(medicine);
});

router.put('/:id', auth, (req, res) => {
  const existing = db.prepare(
    'SELECT * FROM medicines WHERE id = ? AND userId = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Medicine not found' });

  const { name, category, manufacturer, description, sideEffects, dosageForm } = req.body;

  db.prepare(
    `UPDATE medicines SET name = ?, category = ?, manufacturer = ?,
     description = ?, sideEffects = ?, dosageForm = ? WHERE id = ?`
  ).run(
    name || existing.name,
    category !== undefined ? category : existing.category,
    manufacturer !== undefined ? manufacturer : existing.manufacturer,
    description !== undefined ? description : existing.description,
    sideEffects !== undefined ? sideEffects : existing.sideEffects,
    dosageForm !== undefined ? dosageForm : existing.dosageForm,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', auth, (req, res) => {
  const result = db.prepare(
    'DELETE FROM medicines WHERE id = ? AND userId = ?'
  ).run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Medicine not found' });
  res.json({ message: 'Medicine deleted' });
});

module.exports = router;
