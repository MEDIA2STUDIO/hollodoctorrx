const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

function parse(p) {
  return {
    ...p,
    medicines: JSON.parse(p.medicines),
    attachments: JSON.parse(p.attachments || '[]'),
    patientRegNo: p.patientRegNo || '',
    signature: p.signature || '',
  };
}

router.get('/', auth, async (req, res) => {
  const prescriptions = await db.prepare(
    'SELECT * FROM prescriptions WHERE "userId" = ? ORDER BY "createdAt" DESC'
  ).all(req.user.id);
  res.json(prescriptions.map(parse));
});

router.get('/:id', auth, async (req, res) => {
  const prescription = await db.prepare(
    'SELECT * FROM prescriptions WHERE id = ? AND "userId" = ?'
  ).get(req.params.id, req.user.id);
  if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
  res.json(parse(prescription));
});

router.post('/', auth, async (req, res) => {
  const { patientName, patientAge, patientRegNo, diagnosis, medicines, notes, followUpDate, signature } = req.body;
  if (!patientName || !patientAge || !diagnosis || !medicines) {
    return res.status(400).json({ error: 'patientName, patientAge, diagnosis, and medicines are required' });
  }
  const result = await db.prepare(
    `INSERT INTO prescriptions ("userId", "patientName", "patientAge", "patientRegNo", diagnosis, medicines, notes, "followUpDate", signature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, patientName, patientAge, patientRegNo || '', diagnosis, JSON.stringify(medicines), notes || '', followUpDate || '', signature || '');
  const prescription = await db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(result.lastInsertRowid);
  await db.logActivity(req.user.id, req.user.name, 'create_prescription', { prescriptionId: result.lastInsertRowid, patientName });
  res.status(201).json(parse(prescription));
});

router.put('/:id', auth, async (req, res) => {
  const existing = await db.prepare(
    'SELECT * FROM prescriptions WHERE id = ? AND "userId" = ?'
  ).get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Prescription not found' });
  const { patientName, patientAge, patientRegNo, diagnosis, medicines, notes, followUpDate, signature } = req.body;
  await db.prepare(
    `UPDATE prescriptions SET "patientName" = ?, "patientAge" = ?, "patientRegNo" = ?, diagnosis = ?,
     medicines = ?, notes = ?, "followUpDate" = ?, signature = ? WHERE id = ?`
  ).run(
    patientName || existing.patientName,
    patientAge || existing.patientAge,
    patientRegNo !== undefined ? patientRegNo : existing.patientRegNo,
    diagnosis || existing.diagnosis,
    medicines ? JSON.stringify(medicines) : existing.medicines,
    notes !== undefined ? notes : existing.notes,
    followUpDate !== undefined ? followUpDate : existing.followUpDate,
    signature !== undefined ? signature : existing.signature,
    req.params.id
  );
  const updated = await db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  await db.logActivity(req.user.id, req.user.name, 'edit_prescription', { prescriptionId: parseInt(req.params.id), patientName: updated.patientName });
  res.json(parse(updated));
});

router.delete('/:id', auth, async (req, res) => {
  const existing = await db.prepare('SELECT "patientName" FROM prescriptions WHERE id = ? AND "userId" = ?').get(req.params.id, req.user.id);
  const result = await db.prepare(
    'DELETE FROM prescriptions WHERE id = ? AND "userId" = ?'
  ).run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Prescription not found' });
  await db.logActivity(req.user.id, req.user.name, 'delete_prescription', { prescriptionId: parseInt(req.params.id), patientName: existing?.patientName || 'Unknown' });
  res.json({ message: 'Prescription deleted' });
});

module.exports = router;
