const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
    migrate();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sms_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, key)
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_image TEXT,
      recognition_result TEXT,
      copy_result TEXT,
      generated_images TEXT,
      status TEXT DEFAULT 'completed',
      job_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function migrate() {
  // Add phone to users if missing
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('phone')) {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT UNIQUE");
  }

  // Add user_id to history if missing (pre-auth databases)
  const histCols = db.prepare("PRAGMA table_info(history)").all().map(c => c.name);
  if (!histCols.includes('user_id')) {
    db.exec("ALTER TABLE history ADD COLUMN user_id INTEGER DEFAULT 0");
  }
  if (!histCols.includes('job_id')) {
    db.exec("ALTER TABLE history ADD COLUMN job_id TEXT");
  }

  // Migrate settings: if old format (no user_id), recreate
  const setCols = db.prepare("PRAGMA table_info(settings)").all().map(c => c.name);
  if (!setCols.includes('user_id')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings_new (
        user_id INTEGER NOT NULL DEFAULT 0,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, key)
      );
      INSERT OR IGNORE INTO settings_new (key, value, updated_at)
        SELECT key, value, updated_at FROM settings;
      DROP TABLE settings;
      ALTER TABLE settings_new RENAME TO settings;
    `);
  }
}

// ---- Settings CRUD ----
function saveSetting(userId, key, value) {
  const d = getDB();
  d.prepare(`
    INSERT INTO settings (user_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(userId, key, value);
}

function getSetting(userId, key) {
  const d = getDB();
  const row = d.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?').get(userId, key);
  return row ? row.value : null;
}

// ---- History CRUD ----
function createHistory(userId, record) {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO history (user_id, original_image, recognition_result, copy_result, generated_images, status, job_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId,
    record.original_image || null,
    record.recognition_result ? JSON.stringify(record.recognition_result) : null,
    record.copy_result ? JSON.stringify(record.copy_result) : null,
    record.generated_images ? JSON.stringify(record.generated_images) : null,
    record.status || 'completed',
    record.job_id || null
  );
  return { id: result.lastInsertRowid, ...record };
}

function getHistoryList(userId, page = 1, pageSize = 20) {
  const d = getDB();
  const offset = (page - 1) * pageSize;
  const total = d.prepare('SELECT COUNT(*) as count FROM history WHERE user_id = ?').get(userId).count;
  const rows = d.prepare(
    'SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, pageSize, offset);

  return { total, page, pageSize, list: rows.map(parseHistoryRow) };
}

function getHistoryById(userId, id) {
  const d = getDB();
  const row = d.prepare('SELECT * FROM history WHERE id = ? AND user_id = ?').get(id, userId);
  return row ? parseHistoryRow(row) : null;
}

function deleteHistory(userId, id) {
  const d = getDB();
  d.prepare('DELETE FROM history WHERE id = ? AND user_id = ?').run(id, userId);
}

function updateHistoryStatus(userId, id, status, generatedImages, jobId) {
  const d = getDB();
  const params = [status, generatedImages ? JSON.stringify(generatedImages) : null];
  let sql = 'UPDATE history SET status = ?, generated_images = ?';
  if (jobId) {
    sql += ', job_id = ?';
    params.push(jobId);
  }
  sql += ' WHERE id = ? AND user_id = ?';
  params.push(id, userId);
  d.prepare(sql).run(...params);
}

function getPendingHistory() {
  const d = getDB();
  const rows = d.prepare(
    "SELECT * FROM history WHERE status = 'pending_image' AND job_id IS NOT NULL"
  ).all();
  return rows.map(parseHistoryRow);
}

function parseHistoryRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    original_image: row.original_image,
    recognition_result: row.recognition_result ? JSON.parse(row.recognition_result) : null,
    copy_result: row.copy_result ? JSON.parse(row.copy_result) : null,
    generated_images: row.generated_images ? JSON.parse(row.generated_images) : null,
    status: row.status,
    job_id: row.job_id || null,
    created_at: row.created_at,
  };
}

// ---- SMS Codes ----
function saveSmsCode(phone, code, expiresAt) {
  const d = getDB();
  d.prepare('INSERT INTO sms_codes (phone, code, expires_at) VALUES (?, ?, ?)').run(phone, code, expiresAt);
}

function verifySmsCode(phone, code) {
  const d = getDB();
  // First check if code is valid
  const row = d.prepare(
    "SELECT * FROM sms_codes WHERE phone = ? AND code = ? AND expires_at > datetime('now') AND used = 0 ORDER BY id DESC LIMIT 1"
  ).get(phone, code);

  if (!row) return false;

  // Mark this code as used
  d.prepare('UPDATE sms_codes SET used = 1 WHERE id = ?').run(row.id);
  return true;
}

module.exports = {
  getDB,
  saveSetting,
  getSetting,
  createHistory,
  getHistoryList,
  getHistoryById,
  deleteHistory,
  updateHistoryStatus,
  getPendingHistory,
  saveSmsCode,
  verifySmsCode,
};
