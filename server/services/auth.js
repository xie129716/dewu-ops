const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, getRoleByKey, setUserRoles, getUserRoleRows, getUserPermissionRows } = require('./storage');

const JWT_SECRET = process.env.JWT_SECRET || 'dewu-ops-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, isAdmin: !!user.is_admin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function assignDefaultRole(userId, roleKey = 'operator') {
  const role = getRoleByKey(roleKey);
  if (role) {
    setUserRoles(userId, [role.id]);
  }
}

function createUser(username, passwordHash) {
  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) throw new Error('用户名已存在');
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  assignDefaultRole(result.lastInsertRowid, 'operator');
  return { id: result.lastInsertRowid, username };
}

function getUserByUsername(username) {
  return getDB().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  const db = getDB();
  const user = db.prepare('SELECT id, username, points, is_admin, created_at FROM users WHERE id = ?').get(id);
  if (!user) return null;
  return {
    ...user,
    roles: getUserRoleRows(id),
    permissions: getUserPermissionRows(id),
  };
}

function createAdminIfMissing() {
  const db = getDB();
  const admin = db.prepare('SELECT id FROM users WHERE is_admin = 1').get();
  if (!admin) {
    const pwd = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(pwd, 10);
    const result = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, is_admin, points) VALUES (?, ?, 1, 999999)').run('admin', hash);
    const userId = result.lastInsertRowid || db.prepare('SELECT id FROM users WHERE username = ?').get('admin')?.id;
    if (userId) assignDefaultRole(userId, 'super_admin');
    console.log('[Admin] Created admin account (username: admin)');
    return;
  }

  const superAdminRole = getRoleByKey('super_admin');
  if (superAdminRole) {
    const hasRole = db.prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?').get(admin.id, superAdminRole.id);
    if (!hasRole) {
      setUserRoles(admin.id, [superAdminRole.id]);
    }
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  createUser,
  getUserByUsername,
  getUserById,
  createAdminIfMissing,
};
