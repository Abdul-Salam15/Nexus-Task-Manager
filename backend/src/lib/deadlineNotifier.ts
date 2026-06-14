import { db } from '../db/index.js';
import { notifyUser } from './notify.js';
import { todayIso } from './productivity.js';

function tomorrowIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Notifies users about tasks due tomorrow or now overdue, at most once per task per state. */
export async function checkDeadlineNotifications() {
  const today = todayIso();
  const tomorrow = tomorrowIso();

  const dueSoon = db.prepare(
    "SELECT * FROM tasks WHERE status != 'Done' AND deadline = ? AND due_soon_notified = 0"
  ).all(tomorrow) as any[];
  for (const t of dueSoon) {
    await notifyUser(t.user_id, 'deadline', 'Deadline approaching', `"${t.title}" is due tomorrow.`);
    db.prepare('UPDATE tasks SET due_soon_notified = 1 WHERE id = ?').run(t.id);
  }

  const overdue = db.prepare(
    "SELECT * FROM tasks WHERE status != 'Done' AND deadline < ? AND overdue_notified = 0"
  ).all(today) as any[];
  for (const t of overdue) {
    await notifyUser(t.user_id, 'alert', 'Task overdue', `"${t.title}" was due on ${t.deadline} and is now overdue.`);
    db.prepare('UPDATE tasks SET overdue_notified = 1 WHERE id = ?').run(t.id);
  }
}
