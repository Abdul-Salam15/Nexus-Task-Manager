import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { seedActivity, seedNotifications, seedTasks, DEFAULT_CATEGORIES } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'nexus.db');

class CompatStatement {
  constructor(private sqlDb: SqlJsDatabase, private sql: string, private saveFn: () => void) {}

  run(...params: any[]) {
    const bound = this.resolveParams(params);
    this.sqlDb.run(this.sql, bound as any);
    const changes = this.sqlDb.getRowsModified();
    this.saveFn();
    return { changes };
  }

  get(...params: any[]) {
    const stmt = this.sqlDb.prepare(this.sql);
    try {
      stmt.bind(this.resolveParams(params) as any);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params: any[]) {
    const results: any[] = [];
    const stmt = this.sqlDb.prepare(this.sql);
    try {
      stmt.bind(this.resolveParams(params) as any);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  private resolveParams(params: any[]): any[] | Record<string, any> {
    if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      const obj = params[0];
      const mapped: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        mapped[`@${key}`] = obj[key] ?? null;
      }
      return mapped;
    }
    return params.map(v => v ?? null);
  }
}

class CompatDatabase {
  private _inTransaction = false;

  constructor(private sqlDb: SqlJsDatabase) {}

  prepare(sql: string) {
    return new CompatStatement(this.sqlDb, sql, () => this.save());
  }

  exec(sql: string) {
    this.sqlDb.run(sql);
    this.save();
  }

  pragma(setting: string) {
    const results: any[] = [];
    const stmt = this.sqlDb.prepare(`PRAGMA ${setting}`);
    try {
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
    } finally {
      stmt.free();
    }
    if (/=/.test(setting)) {
      this.save();
    }
    return results;
  }

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    const wrapper = (...args: any[]) => {
      this.sqlDb.run('BEGIN');
      this._inTransaction = true;
      try {
        const result = fn(...args);
        this._inTransaction = false;
        this.sqlDb.run('COMMIT');
        this.save();
        return result;
      } catch (err) {
        this._inTransaction = false;
        try { this.sqlDb.run('ROLLBACK'); } catch { /* already rolled back */ }
        throw err;
      }
    };
    return wrapper as unknown as T;
  }

  private save() {
    if (this._inTransaction) return;
    const data = this.sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

const SQL = await initSqlJs();

let sqlDb: SqlJsDatabase;
if (fs.existsSync(DB_PATH)) {
  const buffer = fs.readFileSync(DB_PATH);
  sqlDb = new SQL.Database(buffer);
} else {
  sqlDb = new SQL.Database();
}

export const db = new CompatDatabase(sqlDb);
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
  order_index REAL NOT NULL,
  due_soon_notified INTEGER NOT NULL DEFAULT 0,
  overdue_notified INTEGER NOT NULL DEFAULT 0
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

const taskColumns = (db.pragma('table_info(tasks)') as { name: string }[]).map(c => c.name);
if (!taskColumns.includes('due_soon_notified')) {
  db.exec('ALTER TABLE tasks ADD COLUMN due_soon_notified INTEGER NOT NULL DEFAULT 0');
}
if (!taskColumns.includes('overdue_notified')) {
  db.exec('ALTER TABLE tasks ADD COLUMN overdue_notified INTEGER NOT NULL DEFAULT 0');
}

export function seedUserData(userId: string) {
  const insertCategory = db.prepare('INSERT INTO categories (id, user_id, name, icon) VALUES (?, ?, ?, ?)');
  for (const c of DEFAULT_CATEGORIES) insertCategory.run(uuid(), userId, c.name, c.icon);
}

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
