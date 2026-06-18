const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'prescriptions.db');

let db = null;

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
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

async function initDb() {
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
  migrate();
  saveDb();
}

function prepare(sql) {
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

module.exports = { initDb, prepare };
