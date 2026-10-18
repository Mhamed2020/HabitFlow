import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDb, dbConfig } from './db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(dir, '../data/habitflow.db');

const { url, authToken } = dbConfig(DB_FILE);
const db = await createDb(url, authToken);
const origins = (process.env.CORS_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
const port = Number(process.env.PORT) || 3001;
createApp(db, origins, process.env.FRONTEND_URL || undefined).listen(port, () => console.log(`HabitFlow API on http://localhost:${port}`));
