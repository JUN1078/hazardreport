import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// On Vercel serverless, only /tmp is writable
const isVercel = !!process.env.VERCEL;
const DB_PATH = isVercel
  ? '/tmp/safevision.db'
  : path.join(__dirname, '../../data/safevision.db');

const DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'hse_officer',
    full_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_name TEXT NOT NULL,
    location TEXT,
    inspection_date TEXT NOT NULL,
    inspector_name TEXT,
    department TEXT,
    image_path TEXT NOT NULL,
    image_filename TEXT,
    ai_summary TEXT,
    overall_risk_level TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS hazards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    hazard_type TEXT,
    severity INTEGER NOT NULL CHECK(severity BETWEEN 1 AND 5),
    likelihood INTEGER NOT NULL CHECK(likelihood BETWEEN 1 AND 5),
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    engineering_control TEXT,
    administrative_control TEXT,
    ppe_control TEXT,
    immediate_action TEXT,
    confidence REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id);
  CREATE INDEX IF NOT EXISTS idx_hazards_inspection_id ON hazards(inspection_id);
  CREATE INDEX IF NOT EXISTS idx_hazards_risk_level ON hazards(risk_level);
  CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);
`);

export default db;
