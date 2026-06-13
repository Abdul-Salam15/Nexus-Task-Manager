import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { seedActivity, seedNotifications, seedTasks, DEFAULT_CATEGORIES } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'nexus.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  focus TEXT NOT NULL DEFAULT 'Work',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  email TEXT PRIMARY KEY,
  otp TEXT,
  otp_expires_at TEXT,
  reset_token TEXT,
  reset_expires_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL,
  deadline TEXT NOT NULL,
  effort_hours REAL NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled TEXT,
  completed_at TEXT,
  order_index REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  time TEXT NOT NULL
);
`);

/** Gives a brand-new user the default categories so they have somewhere to file tasks. */
export function seedUserData(userId: string) {
  const insertCategory = db.prepare('INSERT INTO categories (id, user_id, name, icon) VALUES (?, ?, ?, ?)');
  for (const c of DEFAULT_CATEGORIES) insertCategory.run(uuid(), userId, c.name, c.icon);
}

/** Seeds the demo account with the same sample dataset as the design reference. */
function seedDemoData(userId: string) {
  seedUserData(userId);

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, user_id, title, priority, deadline, effort_hours, category, status, scheduled, completed_at, order_index)
    VALUES (@id, @userId, @title, @priority, @deadline, @effortHours, @category, @status, @scheduled, @completedAt, @order)
  `);
  for (const t of seedTasks()) insertTask.run({ ...t, id: uuid(), userId });

  const insertActivity = db.prepare('INSERT INTO activity (id, user_id, text, time) VALUES (?, ?, ?, ?)');
  for (const a of seedActivity()) insertActivity.run(uuid(), userId, a.text, a.time);

  const insertNotif = db.prepare('INSERT INTO notifications (id, user_id, type, title, body, read, time) VALUES (?, ?, ?, ?, ?, 0, ?)');
  for (const n of seedNotifications()) insertNotif.run(uuid(), userId, n.type, n.title, n.body, new Date().toISOString());
}

/** Ensures the demo account (demo@nexus.io / Demo!2026) always exists, matching the design reference. */
export function ensureDemoUser() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@nexus.io') as { id: string } | undefined;
  if (existing) return;
  const id = uuid();
  db.prepare('INSERT INTO users (id, full_name, email, password_hash, focus, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, 'Aisha Khan', 'demo@nexus.io', bcrypt.hashSync('Demo!2026', 10), 'Work', new Date().toISOString()
  );
  seedDemoData(id);
}

ensureDemoUser();
