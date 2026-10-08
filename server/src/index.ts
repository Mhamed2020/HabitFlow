import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDb } from './db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(dir, '../data/habitflow.db');

const db = createDb(DB_FILE);
const port = Number(process.env.PORT) || 3001;
createApp(db).listen(port, () => console.log(`HabitFlow API on http://localhost:${port}`));
