const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const medicines = await db.prepare(
    'SELECT * FROM medicines WHERE "userId" = ? ORDER BY "createdAt" DESC'
  ).all(req.user.id);
  res.json(medicines);
});

router.get('/:id', auth, async (req, res) => {
  const medicine = await db.prepare(
    'SELECT * FROM medicines WHERE id = ? AND "userId" = ?'
  ).get(req.params.id, req.user.id);
  if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
  res.json(medicine);
});

router.post('/', auth, async (req, res) => {
  const { name, category, manufacturer, description, sideEffects, dosageForm } = req.body;
  if (!name) return res.status(400).json({ error: 'Medicine name is required' });

  const result = await db.prepare(
    `INSERT INTO medicines ("userId", name, category, manufacturer, description, "sideEffects", "dosageForm")
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, name, category || '', manufacturer || '', description || '', sideEffects || '', dosageForm || '');

  const medicine = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(result.lastInsertRowid);
  await db.logActivity(req.user.id, req.user.name, 'create_medicine', { medicineId: result.lastInsertRowid, name });
  res.status(201).json(medicine);
});

router.put('/:id', auth, async (req, res) => {
  const existing = await db.prepare(
    'SELECT * FROM medicines WHERE id = ? AND "userId" = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Medicine not found' });

  const { name, category, manufacturer, description, sideEffects, dosageForm } = req.body;

  await db.prepare(
    `UPDATE medicines SET name = ?, category = ?, manufacturer = ?,
     description = ?, "sideEffects" = ?, "dosageForm" = ? WHERE id = ?`
  ).run(
    name || existing.name,
    category !== undefined ? category : existing.category,
    manufacturer !== undefined ? manufacturer : existing.manufacturer,
    description !== undefined ? description : existing.description,
    sideEffects !== undefined ? sideEffects : existing.sideEffects,
    dosageForm !== undefined ? dosageForm : existing.dosageForm,
    req.params.id
  );

  const updated = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  await db.logActivity(req.user.id, req.user.name, 'edit_medicine', { medicineId: parseInt(req.params.id), name: updated.name });
  res.json(updated);
});

router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT name FROM medicines WHERE id = ? AND "userId" = ?').get(req.params.id, req.user.id);
  const result = await db.prepare(
    'DELETE FROM medicines WHERE id = ? AND "userId" = ?'
  ).run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Medicine not found' });
  await db.logActivity(req.user.id, req.user.name, 'delete_medicine', { medicineId: parseInt(req.params.id), name: existing?.name || 'Unknown' });
  res.json({ message: 'Medicine deleted' });
});

module.exports = router;
