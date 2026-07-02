const express = require('express');
const { google } = require('googleapis');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || '/api/drive/callback';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

router.get('/auth', auth, (req, res) => {
  if (!CLIENT_ID) {
    return res.status(400).json({ error: 'Google Drive not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET.' });
  }
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: String(req.user.id),
  });
  res.json({ url });
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' });

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    const userId = parseInt(state);

    await db.prepare('DELETE FROM drive_tokens WHERE "userId" = ?').run(userId);
    await db.prepare(
      'INSERT INTO drive_tokens ("userId", "accessToken", "refreshToken") VALUES (?, ?, ?)'
    ).run(userId, tokens.access_token, tokens.refresh_token || '');

    res.redirect('/?drive=connected');
  } catch (err) {
    console.error('Drive OAuth error:', err.message);
    res.status(500).json({ error: 'Failed to authenticate with Google Drive' });
  }
});

router.post('/upload', auth, async (req, res) => {
  const { fileName, fileData, mimeType } = req.body;
  if (!fileName || !fileData) return res.status(400).json({ error: 'fileName and fileData are required' });

  if (!CLIENT_ID) {
    return res.status(400).json({ error: 'Google Drive not configured' });
  }

  try {
    const tokenRecord = await db.prepare(
      'SELECT * FROM drive_tokens WHERE "userId" = ? ORDER BY id DESC LIMIT 1'
    ).get(req.user.id);

    if (!tokenRecord) return res.status(400).json({ error: 'Connect Google Drive first' });

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken || undefined,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const buffer = Buffer.from(fileData, 'base64');
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: ['root'],
      },
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: buffer,
      },
    });

    await db.logActivity(req.user.id, req.user.name, 'drive_upload', { fileName, driveFileId: response.data.id });
    res.json({ fileId: response.data.id, name: fileName });
  } catch (err) {
    console.error('Drive upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload to Google Drive' });
  }
});

router.get('/status', auth, async (req, res) => {
  const token = await db.prepare(
    'SELECT id FROM drive_tokens WHERE "userId" = ? ORDER BY id DESC LIMIT 1'
  ).get(req.user.id);
  res.json({ connected: !!token });
});

module.exports = router;
