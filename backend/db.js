const initSqlJs = require('sql.js');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'prescriptions.db');
const USE_PG = !!process.env.DATABASE_URL;
const PG_SCHEMA = process.env.PG_SCHEMA || 'public';

let db = null;
let pool = null;

function saveDb() {
  if (!USE_PG) {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  }
}

const PG_TABLES = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  specialization TEXT DEFAULT '',
  "regNo" TEXT DEFAULT '',
  "hospitalName" TEXT DEFAULT '',
  role TEXT DEFAULT 'doctor',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  "patientName" TEXT NOT NULL,
  "patientAge" INTEGER NOT NULL,
  "patientRegNo" TEXT DEFAULT '',
  diagnosis TEXT NOT NULL,
  medicines TEXT NOT NULL,
  notes TEXT DEFAULT '',
  "followUpDate" TEXT DEFAULT '',
  attachments TEXT DEFAULT '[]',
  signature TEXT DEFAULT '',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicines (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  manufacturer TEXT DEFAULT '',
  description TEXT DEFAULT '',
  "sideEffects" TEXT DEFAULT '',
  "dosageForm" TEXT DEFAULT '',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "userName" TEXT DEFAULT '',
  action TEXT NOT NULL,
  details TEXT DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT NOW()
);
`;

async function initDb() {
  if (USE_PG) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      for (const stmt of PG_TABLES.split(';').filter(s => s.trim())) {
        await client.query(stmt);
      }
    } finally {
      client.release();
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@hellodoctor.com']);
    if (existing.rows.length === 0) {
      const hashed = bcrypt.hashSync('admin123', 10);
      await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        ['Admin', 'admin@hellodoctor.com', hashed, 'admin']
      );
    }
  } else {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      db = new SQL.Database();
    }
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      specialization TEXT DEFAULT '',
      regNo TEXT DEFAULT '',
      hospitalName TEXT DEFAULT '',
      role TEXT DEFAULT 'doctor',
      createdAt TEXT DEFAULT (datetime('now'))
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      patientName TEXT NOT NULL,
      patientAge INTEGER NOT NULL,
      patientRegNo TEXT DEFAULT '',
      diagnosis TEXT NOT NULL,
      medicines TEXT NOT NULL,
      notes TEXT DEFAULT '',
      followUpDate TEXT DEFAULT '',
      attachments TEXT DEFAULT '[]',
      signature TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      manufacturer TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sideEffects TEXT DEFAULT '',
      dosageForm TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      userName TEXT DEFAULT '',
      action TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);
    migrate();

    const admin = prepare('SELECT id FROM users WHERE email = ?').get('admin@hellodoctor.com');
    if (!admin) {
      const hashed = bcrypt.hashSync('admin123', 10);
      prepare(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
      ).run('Admin', 'admin@hellodoctor.com', hashed, 'admin');
    }
    saveDb();
  }
}

function migrate() {
  const userCols = db.exec("PRAGMA table_info(users)");
  const userNames = userCols[0]?.values.map(v => v[1]) || [];
  if (!userNames.includes('regNo')) {
    db.exec("ALTER TABLE users ADD COLUMN regNo TEXT DEFAULT ''");
    saveDb();
  }
  if (!userNames.includes('hospitalName')) {
    db.exec("ALTER TABLE users ADD COLUMN hospitalName TEXT DEFAULT ''");
    saveDb();
  }
  if (!userNames.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'doctor'");
    saveDb();
  }
  const rxCols = db.exec("PRAGMA table_info(prescriptions)");
  const rxNames = rxCols[0]?.values.map(v => v[1]) || [];
  if (!rxNames.includes('attachments')) {
    db.exec("ALTER TABLE prescriptions ADD COLUMN attachments TEXT DEFAULT '[]'");
    saveDb();
  }
  if (!rxNames.includes('patientRegNo')) {
    db.exec("ALTER TABLE prescriptions ADD COLUMN patientRegNo TEXT DEFAULT ''");
    saveDb();
  }
  if (!rxNames.includes('signature')) {
    db.exec("ALTER TABLE prescriptions ADD COLUMN signature TEXT DEFAULT ''");
    saveDb();
  }
}

async function logActivity(userId, userName, action, details = {}) {
  try {
    const p = prepare(
      'INSERT INTO activity_log ("userId", "userName", action, details) VALUES (?, ?, ?, ?)'
    );
    await p.run(userId, userName, action, JSON.stringify(details));
  } catch (e) {
    console.error('Failed to log activity:', e.message);
  }
}

function prepare(sql) {
  if (USE_PG) {
    let idx = 0;
    const pgSql = sql
      .replace(/\?/g, () => `$${++idx}`)
      .replace(/datetime\('now'\)/g, 'NOW()');
    const isInsert = /^\s*INSERT\s/i.test(sql);
    const querySql = isInsert ? pgSql + ' RETURNING id' : pgSql;
    return {
      get: async (...params) => {
        const result = await pool.query(querySql, params);
        return result.rows[0] || undefined;
      },
      all: async (...params) => {
        const result = await pool.query(querySql, params);
        return result.rows;
      },
      run: async (...params) => {
        const result = await pool.query(querySql, params);
        return {
          changes: result.rowCount,
          lastInsertRowid: isInsert ? result.rows[0]?.id : null,
        };
      },
    };
  } else {
    return {
      get: (...params) => {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        const changes = db.getRowsModified();
        const rid = db.exec("SELECT last_insert_rowid()");
        const lastInsertRowid = rid[0]?.values[0]?.[0] ?? null;
        saveDb();
        return { changes, lastInsertRowid };
      },
    };
  }
}

module.exports = { initDb, prepare, logActivity };
