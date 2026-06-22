const express = require('express');
const router = express.Router();
const {
  hashPassword, verifyPassword, signToken,
  createUser,
  getUserByUsername, getUserById,
} = require('../services/auth');
const authMiddleware = require('../middleware/auth');

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    points: user.points || 0,
    isAdmin: !!user.is_admin,
    roles: (user.roles || []).map(role => role.key),
    roleDetails: user.roles || [],
    permissions: (user.permissions || []).map(permission => permission.key),
    permissionDetails: user.permissions || [],
    created_at: user.created_at,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名长度需在 2-20 个字符之间' });
    if (password.length < 6) return res.status(400).json({ error: '密码长度至少 6 位' });

    const hash = await hashPassword(password);
    const created = createUser(username, hash);
    const user = getUserById(created.id);
    const token = signToken({ ...user, is_admin: user.is_admin });
    res.json({ success: true, token, user: serializeUser(user) });
  } catch (err) {
    if (err.message === '用户名已存在') return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请填写账号和密码' });

    const user = getUserByUsername(username);
    if (!user) return res.status(401).json({ error: '账号或密码错误' });
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '账号或密码错误' });

    const fullUser = getUserById(user.id);
    const token = signToken({ ...fullUser, is_admin: user.is_admin });
    res.json({ success: true, token, user: serializeUser(fullUser) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(serializeUser(user));
});

module.exports = router;
