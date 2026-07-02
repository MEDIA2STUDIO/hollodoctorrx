const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|txt)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, docs, and text files are allowed'));
    }
  },
});

router.post('/:prescriptionId', auth, upload.single('file'), async (req, res) => {
  const prescription = await db.prepare(
    'SELECT * FROM prescriptions WHERE id = ? AND "userId" = ?'
  ).get(req.params.prescriptionId, req.user.id);

  if (!prescription) {
    return res.status(404).json({ error: 'Prescription not found' });
  }

  const attachments = JSON.parse(prescription.attachments || '[]');
  attachments.push({
    id: Date.now(),
    name: req.file.originalname,
    path: req.file.filename,
    size: req.file.size,
  });

  await db.prepare('UPDATE prescriptions SET attachments = ? WHERE id = ?')
    .run(JSON.stringify(attachments), req.params.prescriptionId);

  await db.logActivity(req.user.id, req.user.name, 'upload_file', { prescriptionId: parseInt(req.params.prescriptionId), fileName: req.file.originalname });
  res.json({ attachments });
});

router.delete('/:prescriptionId/:fileId', auth, async (req, res) => {
  const prescription = await db.prepare(
    'SELECT * FROM prescriptions WHERE id = ? AND "userId" = ?'
  ).get(req.params.prescriptionId, req.user.id);

  if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

  let attachments = JSON.parse(prescription.attachments || '[]');
  const fileIndex = attachments.findIndex(a => String(a.id) === req.params.fileId);
  if (fileIndex === -1) return res.status(404).json({ error: 'File not found' });

  const [removed] = attachments.splice(fileIndex, 1);

  const fs = require('fs');
  const filePath = path.join(__dirname, '..', 'uploads', removed.path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.prepare('UPDATE prescriptions SET attachments = ? WHERE id = ?')
    .run(JSON.stringify(attachments), req.params.prescriptionId);

  await db.logActivity(req.user.id, req.user.name, 'delete_file', { prescriptionId: parseInt(req.params.prescriptionId), fileName: removed.name });
  res.json({ attachments });
});

module.exports = router;
