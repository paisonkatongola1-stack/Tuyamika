import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');

dotenv.config({ path: path.join(root, '.env') });

const dataDir = path.isAbsolute(process.env.DATA_DIR || '')
  ? process.env.DATA_DIR
  : path.join(root, process.env.DATA_DIR || 'data');

fs.mkdirSync(dataDir, { recursive: true });

const raw = new DatabaseSync(path.join(dataDir, 'tuyamika.db'));
raw.exec('PRAGMA busy_timeout = 5000');
raw.exec('PRAGMA journal_mode = WAL');

export const db = {
  raw,
  prepare(sql) {
    return raw.prepare(sql);
  },
  exec(sql) {
    return raw.exec(sql);
  },
  pragma(stmt) {
    return raw.exec(stmt);
  },
  transaction(fn) {
    let depth = 0;
    return (...args) => {
      if (depth === 1) return fn(...args);
      depth += 1;
      raw.exec('BEGIN IMMEDIATE');
      try {
        const out = fn(...args);
        raw.exec('COMMIT');
        depth -= 1;
        return out;
      } catch (err) {
        depth -= 1;
        try {
          raw.exec('ROLLBACK');
        } catch {
          /* rollback of failed tx */
        }
        throw err;
      }
    };
  },
};

raw.exec(fs.readFileSync(path.join(root, 'src', 'data', 'schema.sql'), 'utf8'));

export const uid = () => crypto.randomUUID();
export const token = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
export const now = () => Date.now();

export const q = {
  getUser: () => db.prepare('SELECT id, email, phone, full_name, country, role, verified, created_at FROM users WHERE id = ?'),
  getUserByEmail: () => db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserByIdOrPhone: () => db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?'),
};

export function runMigrations() {
  const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const existingTables = tableNames.map(t => t.name);
  console.log(`db_migrate: current tables: ${JSON.stringify(existingTables)}`);
  db.exec(fs.readFileSync(path.join(root, 'src', 'data', 'schema.sql'), 'utf8'));
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userCols.includes('firebase_uid')) {
    db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT');
    console.log('db_migrate: users.firebase_uid added');
  }
  if (!userCols.includes('email_optout')) {
    db.exec('ALTER TABLE users ADD COLUMN email_optout INTEGER NOT NULL DEFAULT 0');
    console.log('db_migrate: users.email_optout added');
  }
  console.log('db_migrate: schema applied');
}

export function fail(status, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  Object.assign(err, extra);
  console.error(`db_error: ${status} ${message} ${JSON.stringify(extra)}`);
  return err;
}
