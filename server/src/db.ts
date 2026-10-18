import { createClient, type Client, type InValue } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

export type Db = Client;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  UNIQUE (habit_id, date)
);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);
`;

/**
 * Open a database and apply the schema.
 * `url` is ':memory:' (tests), 'file:<path>' (local dev) or a Turso 'libsql://...' URL.
 */
export async function createDb(url = ':memory:', authToken?: string): Promise<Db> {
  if (url.startsWith('file:')) fs.mkdirSync(path.dirname(url.slice('file:'.length)), { recursive: true });
  const db = createClient({ url, authToken });
  await db.execute('PRAGMA foreign_keys = ON');
  await db.executeMultiple(SCHEMA);
  return db;
}

/** Database from the environment (Turso in production), or the local file used in dev. */
export function dbConfig(defaultFile: string): { url: string; authToken?: string } {
  return {
    url: process.env.DATABASE_URL || `file:${defaultFile}`,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  };
}

export async function all<T>(db: Db, sql: string, args: InValue[] = []): Promise<T[]> {
  return (await db.execute({ sql, args })).rows as unknown as T[];
}

export async function get<T>(db: Db, sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(db, sql, args))[0];
}

/** Run a write statement; returns the new row id for INSERTs. */
export async function run(db: Db, sql: string, args: InValue[] = []): Promise<number> {
  return Number((await db.execute({ sql, args })).lastInsertRowid ?? 0);
}
