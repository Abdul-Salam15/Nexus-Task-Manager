import { Router } from 'express';
import { db } from '../db/index.js';
import { toNotificationJson } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY rowid DESC').all(req.userId!);
  res.json({ notifications: rows.map(toNotificationJson) });
});

router.patch('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.userId!);
  res.status(204).end();
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);
  if (result.changes === 0) return res.status(404).json({ message: 'Notification not found' });
  res.status(204).end();
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.userId!);
  res.status(204).end();
});

export default router;
