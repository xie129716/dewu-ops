const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('./storage');

const JWT_SECRET = process.env.JWT_SECRET || 'dewu-ops-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

// ---- Password ----
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ---- JWT ----
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ---- User CRUD ----
function createUser(username, passwordHash) {
  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new Error('用户名已存在');
  }
  const result = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).run(username, passwordHash);
  return { id: result.lastInsertRowid, username };
}

function getUserByUsername(username) {
  const db = getDB();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  const db = getDB();
  return db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id);
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  createUser,
  getUserByUsername,
  getUserById,
};
