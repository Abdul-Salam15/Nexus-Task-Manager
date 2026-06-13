import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { toTaskJson } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';
import { runAutoSchedule } from '../lib/scheduler.js';

const router = Router();
router.use(requireAuth);

const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Pending', 'In Progress', 'Done'];

function todayIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function getTasks(userId: string) {
  return db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY order_index ASC').all(userId);
}

router.get('/', (req, res) => {
  res.json({ tasks: getTasks(req.userId!).map(toTaskJson) });
});

router.post('/', (req, res) => {
  const { title, priority, deadline, effortHours, category, status } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ message: 'Title is required' });
  if (!deadline) return res.status(400).json({ message: 'Deadline is required' });
  if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ message: 'Invalid priority' });
  if (status && !STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  const minOrder = db.prepare('SELECT MIN(order_index) AS m FROM tasks WHERE user_id = ?').get(req.userId!) as { m: number | null };
  const order = (minOrder.m ?? 0) - 1;

  const id = uuid();
  const isDone = status === 'Done';
  db.prepare(`
    INSERT INTO tasks (id, user_id, title, priority, deadline, effort_hours, category, status, scheduled, completed_at, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `).run(
    id, req.userId, String(title).trim(), priority || 'Medium', deadline,
    effortHours ?? 1, category || 'Work', status || 'Pending',
    isDone ? todayIso() : null, order
  );

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json({ task: toTaskJson(row) });
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!existing) return res.status(404).json({ message: 'Task not found' });

  const { title, priority, deadline, effortHours, category, status, scheduled } = req.body || {};
  if (priority !== undefined && !PRIORITIES.includes(priority)) return res.status(400).json({ message: 'Invalid priority' });
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  const next = {
    title: title !== undefined ? String(title).trim() : existing.title,
    priority: priority !== undefined ? priority : existing.priority,
    deadline: deadline !== undefined ? deadline : existing.deadline,
    effort_hours: effortHours !== undefined ? effortHours : existing.effort_hours,
    category: category !== undefined ? category : existing.category,
    status: status !== undefined ? status : existing.status,
    scheduled: scheduled !== undefined ? scheduled : existing.scheduled,
    completed_at: existing.completed_at,
  };

  // Marking a task Done stamps today's date; reopening clears it.
  if (status !== undefined && status !== existing.status) {
    if (status === 'Done') next.completed_at = todayIso();
    else if (existing.status === 'Done') next.completed_at = null;
  }

  db.prepare(`
    UPDATE tasks SET title = ?, priority = ?, deadline = ?, effort_hours = ?, category = ?, status = ?, scheduled = ?, completed_at = ?
    WHERE id = ? AND user_id = ?
  `).run(next.title, next.priority, next.deadline, next.effort_hours, next.category, next.status, next.scheduled, next.completed_at, req.params.id, req.userId);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ task: toTaskJson(row) });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId!);
  if (result.changes === 0) return res.status(404).json({ message: 'Task not found' });
  res.status(204).end();
});

router.post('/reorder', (req, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds must be an array' });

  const update = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ? AND user_id = ?');
  const tx = db.transaction((ids: string[]) => {
    ids.forEach((id, i) => update.run(i, id, req.userId!));
  });
  tx(orderedIds);

  res.json({ tasks: getTasks(req.userId!).map(toTaskJson) });
});

router.post('/auto-schedule', (req, res) => {
  const tasks = getTasks(req.userId!) as any[];

  const clear = db.prepare("UPDATE tasks SET scheduled = NULL WHERE id = ? AND status != 'Done'");
  tasks.forEach(t => clear.run(t.id));

  const refreshed = getTasks(req.userId!) as any[];
  const schedule = runAutoSchedule(refreshed.map(t => ({
    id: t.id, priority: t.priority, deadline: t.deadline, effortHours: t.effort_hours, status: t.status, scheduled: t.scheduled,
  })));

  const setScheduled = db.prepare('UPDATE tasks SET scheduled = ? WHERE id = ? AND user_id = ?');
  const tx = db.transaction((entries: [string, string][]) => {
    for (const [id, date] of entries) setScheduled.run(date, id, req.userId!);
  });
  tx([...schedule.entries()]);

  res.json({ tasks: getTasks(req.userId!).map(toTaskJson) });
});

router.post('/clear-schedule', (req, res) => {
  db.prepare("UPDATE tasks SET scheduled = NULL WHERE user_id = ? AND status != 'Done'").run(req.userId!);
  res.json({ tasks: getTasks(req.userId!).map(toTaskJson) });
});

export default router;
