import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { toActivityJson } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM activity WHERE user_id = ? ORDER BY rowid DESC LIMIT 200').all(req.userId!);
  res.json({ activity: rows.map(toActivityJson) });
});

router.post('/', (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ message: 'Text is required' });

  const id = uuid();
  const time = new Date().toISOString();
  db.prepare('INSERT INTO activity (id, user_id, text, time) VALUES (?, ?, ?, ?)').run(id, req.userId, String(text).trim(), time);

  const row = db.prepare('SELECT * FROM activity WHERE id = ?').get(id);
  res.status(201).json({ activity: toActivityJson(row) });
});

export default router;
