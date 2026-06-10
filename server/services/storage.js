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
      password_hash TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- System-level config (API keys, admin settings — no user_id)
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Daily check-ins
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      check_date TEXT NOT NULL,
      points_earned INTEGER DEFAULT 20,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, check_date)
    );

    -- Per-user settings (deprecated — kept for compatibility)
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
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('points')) {
    db.exec("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0");
  }
  if (!userCols.includes('phone')) {
    try { db.exec("ALTER TABLE users ADD COLUMN phone TEXT"); } catch (e) { /* may exist */ }
  }

  const histCols = db.prepare("PRAGMA table_info(history)").all().map(c => c.name);
  if (!histCols.includes('user_id')) {
    db.exec("ALTER TABLE history ADD COLUMN user_id INTEGER DEFAULT 0");
  }
  if (!histCols.includes('job_id')) {
    db.exec("ALTER TABLE history ADD COLUMN job_id TEXT");
  }
}

// ---- System Config ----
function getSystemConfig(key) {
  const d = getDB();
  const row = d.prepare('SELECT value FROM system_config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSystemConfig(key, value) {
  const d = getDB();
  d.prepare(`
    INSERT INTO system_config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

// ---- Per-user Settings (for compatibility) ----
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

// ---- Points ----
function getUserPoints(userId) {
  const d = getDB();
  const row = d.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  return row ? row.points : 0;
}

function addPoints(userId, amount) {
  const d = getDB();
  d.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(amount, userId);
}

function deductPoints(userId, amount) {
  const d = getDB();
  const row = d.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  if (!row || row.points < amount) return false;
  d.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(amount, userId);
  return true;
}

// ---- Check-in ----
function checkinToday(userId) {
  const d = getDB();
  const today = new Date().toISOString().slice(0, 10);
  try {
    d.prepare('INSERT INTO checkins (user_id, check_date, points_earned) VALUES (?, ?, 20)').run(userId, today);
    addPoints(userId, 20);
    return true;
  } catch (e) {
    // UNIQUE constraint — already checked in today
    return false;
  }
}

function hasCheckedInToday(userId) {
  const d = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const row = d.prepare('SELECT id FROM checkins WHERE user_id = ? AND check_date = ?').get(userId, today);
  return !!row;
}

// ---- History CRUD ----
function createHistory(userId, record) {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO history (user_id, original_image, recognition_result, copy_result, generated_images, status, job_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId, record.original_image || null,
    record.recognition_result ? JSON.stringify(record.recognition_result) : null,
    record.copy_result ? JSON.stringify(record.copy_result) : null,
    record.generated_images ? JSON.stringify(record.generated_images) : null,
    record.status || 'completed', record.job_id || null
  );
  return { id: result.lastInsertRowid, ...record };
}

function getHistoryList(userId, page = 1, pageSize = 20) {
  const d = getDB();
  const offset = (page - 1) * pageSize;
  const total = d.prepare('SELECT COUNT(*) as count FROM history WHERE user_id = ?').get(userId).count;
  const rows = d.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(userId, pageSize, offset);
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
  if (jobId) { sql += ', job_id = ?'; params.push(jobId); }
  sql += ' WHERE id = ? AND user_id = ?';
  params.push(id, userId);
  d.prepare(sql).run(...params);
}

function getPendingHistory() {
  const d = getDB();
  const rows = d.prepare("SELECT * FROM history WHERE status = 'pending_image' AND job_id IS NOT NULL").all();
  return rows.map(parseHistoryRow);
}

function parseHistoryRow(row) {
  return {
    id: row.id, user_id: row.user_id, original_image: row.original_image,
    recognition_result: row.recognition_result ? JSON.parse(row.recognition_result) : null,
    copy_result: row.copy_result ? JSON.parse(row.copy_result) : null,
    generated_images: row.generated_images ? JSON.parse(row.generated_images) : null,
    status: row.status, job_id: row.job_id || null, created_at: row.created_at,
  };
}

module.exports = {
  getDB, saveSetting, getSetting,
  getSystemConfig, setSystemConfig,
  getUserPoints, addPoints, deductPoints,
  checkinToday, hasCheckedInToday,
  createHistory, getHistoryList, getHistoryById, deleteHistory,
  updateHistoryStatus, getPendingHistory,
};
