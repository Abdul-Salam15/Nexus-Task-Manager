import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { toCategoryJson } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY rowid ASC').all(req.userId!);
  res.json({ categories: rows.map(toCategoryJson) });
});

router.post('/', (req, res) => {
  const { name, icon } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });

  const trimmed = String(name).trim();
  const existing = db.prepare('SELECT * FROM categories WHERE user_id = ? AND name = ?').get(req.userId!, trimmed);
  if (existing) return res.status(200).json({ category: toCategoryJson(existing) });

  const id = uuid();
  db.prepare('INSERT INTO categories (id, user_id, name, icon) VALUES (?, ?, ?, ?)').run(id, req.userId, trimmed, icon || '🏷️');
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.status(201).json({ category: toCategoryJson(row) });
});

router.delete('/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const category = db.prepare('SELECT * FROM categories WHERE user_id = ? AND name = ?').get(req.userId!, name) as any;
  if (!category) return res.status(404).json({ message: 'Category not found' });

  const count = (db.prepare('SELECT COUNT(*) AS n FROM categories WHERE user_id = ?').get(req.userId!) as { n: number }).n;
  if (count <= 1) return res.status(400).json({ message: 'Cannot remove the last remaining category' });

  const tx = db.transaction(() => {
    const usedByTasks = (db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND category = ?').get(req.userId!, name) as { n: number }).n;
    if (usedByTasks > 0) {
      let fallback = db.prepare('SELECT * FROM categories WHERE user_id = ? AND name = ?').get(req.userId!, 'Uncategorized') as any;
      if (!fallback) {
        db.prepare('INSERT INTO categories (id, user_id, name, icon) VALUES (?, ?, ?, ?)').run(uuid(), req.userId, 'Uncategorized', '🏷️');
        fallback = db.prepare('SELECT * FROM categories WHERE user_id = ? AND name = ?').get(req.userId!, 'Uncategorized');
      }
      db.prepare('UPDATE tasks SET category = ? WHERE user_id = ? AND category = ?').run(fallback.name, req.userId!, name);
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(category.id);
  });
  tx();

  res.status(204).end();
});

export default router;
