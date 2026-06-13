import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db, seedUserData } from '../db/index.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_EXPIRES_IN_MS } from '../lib/jwt.js';
import { toUserJson } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';
import { sendOtpEmail } from '../lib/mailer.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

function issueTokens(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_IN_MS).toISOString();
  db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(refreshToken, userId, expiresAt);
  return { accessToken, refreshToken };
}

router.post('/signup', (req, res) => {
  const { fullName, email, password } = req.body || {};
  if (!fullName || !email || !password) return res.status(400).json({ message: 'Missing required fields' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Invalid email address' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ message: 'An account with that email already exists' });

  const id = uuid();
  db.prepare('INSERT INTO users (id, full_name, email, password_hash, focus, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, fullName.trim(), email.toLowerCase(), bcrypt.hashSync(password, 10), 'Work', new Date().toISOString()
  );
  seedUserData(id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const tokens = issueTokens(id);
  res.status(201).json({ user: toUserJson(user), ...tokens });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase()) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const tokens = issueTokens(user.id);
  res.json({ user: toUserJson(user), ...tokens });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });

  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken) as any;
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    res.json({ accessToken: signAccessToken(payload.sub) });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: toUserJson(user) });
});

router.patch('/me', requireAuth, (req, res) => {
  const { fullName, focus } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) return res.status(404).json({ message: 'User not found' });

  const nextFullName = fullName !== undefined ? String(fullName).trim() || user.full_name : user.full_name;
  const nextFocus = focus !== undefined ? focus : user.focus;
  db.prepare('UPDATE users SET full_name = ?, focus = ? WHERE id = ?').run(nextFullName, nextFocus, req.userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: toUserJson(updated) });
});

// --- Password reset flow (OTP sent via email, falls back to console if SMTP isn't configured) ---

router.post('/forgot/request', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Missing email' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (user) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    db.prepare(`
      INSERT INTO password_resets (email, otp, otp_expires_at, reset_token, reset_expires_at)
      VALUES (?, ?, ?, NULL, NULL)
      ON CONFLICT(email) DO UPDATE SET otp = ?, otp_expires_at = ?, reset_token = NULL, reset_expires_at = NULL
    `).run(String(email).toLowerCase(), otp, otpExpiresAt, otp, otpExpiresAt);
    try {
      await sendOtpEmail(String(email).toLowerCase(), otp);
    } catch (err) {
      console.error('[nexus] Failed to send password reset email:', err);
    }
  }
  // Always respond with success to avoid leaking which emails are registered.
  res.json({ ok: true });
});

router.post('/forgot/verify', (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ message: 'Missing email or code' });

  const row = db.prepare('SELECT * FROM password_resets WHERE email = ?').get(String(email).toLowerCase()) as any;
  if (!row || row.otp !== otp || new Date(row.otp_expires_at) < new Date()) {
    return res.status(400).json({ message: 'Invalid or expired code' });
  }

  const resetToken = uuid();
  const resetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  db.prepare('UPDATE password_resets SET reset_token = ?, reset_expires_at = ?, otp = NULL WHERE email = ?').run(resetToken, resetExpiresAt, row.email);

  res.json({ resetToken });
});

router.post('/forgot/reset', (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || !newPassword) return res.status(400).json({ message: 'Missing reset token or password' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const row = db.prepare('SELECT * FROM password_resets WHERE reset_token = ?').get(resetToken) as any;
  if (!row || !row.reset_expires_at || new Date(row.reset_expires_at) < new Date()) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(bcrypt.hashSync(newPassword, 10), row.email);
  db.prepare('DELETE FROM password_resets WHERE email = ?').run(row.email);

  res.json({ ok: true });
});

export default router;
