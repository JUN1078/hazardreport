import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const isVercel = !!process.env.VERCEL;
const DB_PATH = isVercel
  ? '/tmp/safevision.db'
  : path.join(__dirname, '../../data/safevision.db');

const SCHEMA = `
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
    latitude REAL,
    longitude REAL,
    location_accuracy REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS hazards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    hazard_type TEXT,
    severity INTEGER NOT NULL,
    likelihood INTEGER NOT NULL,
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
`;

class SQLiteWrapper {
  constructor(private sqlDb: any) {}

  exec(sql: string) {
    this.sqlDb.run(sql);
    this._save();
  }

  pragma(statement: string) {
    try { this.sqlDb.run(`PRAGMA ${statement}`); } catch { /* ignore */ }
  }

  prepare(sql: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get(...params: any[]): any {
        const stmt = self.sqlDb.prepare(sql);
        try {
          if (params.length) stmt.bind(params);
          if (!stmt.step()) return undefined;
          return stmt.getAsObject();
        } finally {
          stmt.free();
        }
      },
      all(...params: any[]): any[] {
        const stmt = self.sqlDb.prepare(sql);
        const rows: any[] = [];
        try {
          if (params.length) stmt.bind(params);
          while (stmt.step()) rows.push(stmt.getAsObject());
          return rows;
        } finally {
          stmt.free();
        }
      },
      run(...params: any[]): { lastInsertRowid: number; changes: number } {
        const stmt = self.sqlDb.prepare(sql);
        try {
          if (params.length) stmt.bind(params);
          stmt.step();
          const idRes = self.sqlDb.exec('SELECT last_insert_rowid()');
          const lastInsertRowid = (idRes[0]?.values[0][0] as number) ?? 0;
          const changes = self.sqlDb.getRowsModified();
          self._save();
          return { lastInsertRowid, changes };
        } finally {
          stmt.free();
        }
      },
    };
  }

  transaction(fn: (arg: any) => void) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return (arg: any) => {
      self.sqlDb.run('BEGIN');
      try {
        fn(arg);
        self.sqlDb.run('COMMIT');
        self._save();
      } catch (e) {
        self.sqlDb.run('ROLLBACK');
        throw e;
      }
    };
  }

  _save() {
    try {
      const data = this.sqlDb.export();
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch { /* ignore on read-only environments */ }
  }
}

let _dbInstance: SQLiteWrapper | null = null;
let _initPromise: Promise<SQLiteWrapper> | null = null;

export async function getDb(): Promise<SQLiteWrapper> {
  if (_dbInstance) return _dbInstance;
  if (!_initPromise) {
    _initPromise = (async () => {
      const SQL = await initSqlJs();
      let sqlDb: any;
      if (fs.existsSync(DB_PATH)) {
        const buf = fs.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(buf);
      } else {
        sqlDb = new SQL.Database();
      }
      sqlDb.run(SCHEMA);
      // Migrations: add GPS columns to existing databases (ignore errors if already present)
      for (const col of [
        'ALTER TABLE inspections ADD COLUMN latitude REAL',
        'ALTER TABLE inspections ADD COLUMN longitude REAL',
        'ALTER TABLE inspections ADD COLUMN location_accuracy REAL',
      ]) { try { sqlDb.run(col); } catch { /* already exists */ } }
      _dbInstance = new SQLiteWrapper(sqlDb);
      return _dbInstance;
    })();
  }
  return _initPromise;
}

export default getDb;
