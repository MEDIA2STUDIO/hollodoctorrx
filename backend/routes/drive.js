const express = require('express');
const { google } = require('googleapis');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getOAuth2Client(redirectUri) {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

router.get('/auth', auth, (req, res) => {
  if (!CLIENT_ID) {
    return res.status(400).json({ error: 'Google Drive not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET.' });
  }
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/drive/callback`;
  const oauth2Client = getOAuth2Client(redirectUri);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: String(req.user.id),
  });
  res.json({ url });
});

router.get('/callback', async (req, res) => {
  const { code, state, error: gError } = req.query;
  console.log('Drive callback hit:', JSON.stringify(req.query));

  if (gError) {
    return res.status(400).send(`<h2>Google Drive Auth Failed</h2><p>${gError}</p><p>${req.query.error_description || ''}</p>`);
  }

  if (!code || !state) {
    return res.status(400).send(`<h2>Missing Parameters</h2><p>Expected "code" and "state" in the URL. Received: ${JSON.stringify(Object.keys(req.query))}</p><p>Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}</p>`);
  }

  try {
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/drive/callback`;
    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    const userId = parseInt(state);

    await db.prepare('DELETE FROM drive_tokens WHERE "userId" = ?').run(userId);
    await db.prepare(
      'INSERT INTO drive_tokens ("userId", "accessToken", "refreshToken") VALUES (?, ?, ?)'
    ).run(userId, tokens.access_token, tokens.refresh_token || '');

    res.send(`<h2>Google Drive Connected!</h2><p>You can close this tab and go back to the app.</p><script>window.opener?.postMessage('drive-connected','*');window.close()</script>`);
  } catch (err) {
    console.error('Drive OAuth error:', err.message);
    res.status(500).send(`<h2>Error</h2><p>${err.message}</p>`);
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
