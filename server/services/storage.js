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
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_image TEXT,
      recognition_result TEXT,
      copy_result TEXT,
      generated_images TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Migrate: add job_id column if missing (for older databases)
function migrate() {
  const cols = db.prepare("PRAGMA table_info(history)").all().map(c => c.name);
  if (!cols.includes('job_id')) {
    db.exec("ALTER TABLE history ADD COLUMN job_id TEXT");
  }
}

// ---- Settings CRUD ----
function saveSetting(key, value) {
  const d = getDB();
  d.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

function getSetting(key) {
  const d = getDB();
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function getAllSettings() {
  const d = getDB();
  return d.prepare('SELECT key, value, updated_at FROM settings').all();
}

// ---- History CRUD ----
function createHistory(record) {
  const d = getDB();
  const stmt = d.prepare(`
    INSERT INTO history (original_image, recognition_result, copy_result, generated_images, status, job_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    record.original_image || null,
    record.recognition_result ? JSON.stringify(record.recognition_result) : null,
    record.copy_result ? JSON.stringify(record.copy_result) : null,
    record.generated_images ? JSON.stringify(record.generated_images) : null,
    record.status || 'completed',
    record.job_id || null
  );
  return { id: result.lastInsertRowid, ...record };
}

function getHistoryList(page = 1, pageSize = 20) {
  const d = getDB();
  const offset = (page - 1) * pageSize;
  const total = d.prepare('SELECT COUNT(*) as count FROM history').get().count;
  const rows = d.prepare(
    'SELECT * FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(pageSize, offset);

  return {
    total,
    page,
    pageSize,
    list: rows.map(parseHistoryRow),
  };
}

function getHistoryById(id) {
  const d = getDB();
  const row = d.prepare('SELECT * FROM history WHERE id = ?').get(id);
  return row ? parseHistoryRow(row) : null;
}

function deleteHistory(id) {
  const d = getDB();
  d.prepare('DELETE FROM history WHERE id = ?').run(id);
}

function updateHistoryStatus(id, status, generatedImages, jobId) {
  const d = getDB();
  const params = [status, generatedImages ? JSON.stringify(generatedImages) : null];
  let sql = 'UPDATE history SET status = ?, generated_images = ?';
  if (jobId) {
    sql += ', job_id = ?';
    params.push(jobId);
  }
  sql += ' WHERE id = ?';
  params.push(id);
  d.prepare(sql).run(...params);
}

// Get all history records that are still pending (image generation not completed)
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
    original_image: row.original_image,
    recognition_result: row.recognition_result ? JSON.parse(row.recognition_result) : null,
    copy_result: row.copy_result ? JSON.parse(row.copy_result) : null,
    generated_images: row.generated_images ? JSON.parse(row.generated_images) : null,
    status: row.status,
    job_id: row.job_id || null,
    created_at: row.created_at,
  };
}

module.exports = {
  getDB,
  saveSetting,
  getSetting,
  getAllSettings,
  createHistory,
  getHistoryList,
  getHistoryById,
  deleteHistory,
  updateHistoryStatus,
  getPendingHistory,
};
