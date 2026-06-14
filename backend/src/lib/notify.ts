import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { sendNotificationEmail } from './mailer.js';

export type NotificationType = 'alert' | 'deadline' | 'tip';

/** Records an in-app notification for the user and emails them about it. */
export async function notifyUser(userId: string, type: NotificationType, title: string, body: string) {
  db.prepare('INSERT INTO notifications (id, user_id, type, title, body, read, time) VALUES (?, ?, ?, ?, ?, 0, ?)')
    .run(uuid(), userId, type, title, body, new Date().toISOString());

  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;
  if (!user?.email) return;

  try {
    await sendNotificationEmail(user.email, title, body);
  } catch (err: any) {
    console.error('[nexus] Failed to send notification email:', err.message);
  }
}
