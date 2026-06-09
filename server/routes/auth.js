const express = require('express');
const router = express.Router();
const {
  hashPassword, verifyPassword, signToken,
  createUser, createUserByPhone,
  getUserByUsername, getUserByPhone, getUserById,
} = require('../services/auth');
const { sendSms } = require('../services/sms');
const authMiddleware = require('../middleware/auth');

// In-memory code store: phone -> { code, expiresAt }
const codeStore = new Map();

// Send SMS verification code
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: '手机号不能为空' });
    if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    codeStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Clean expired
    for (const [k, v] of codeStore) {
      if (v.expiresAt < Date.now()) codeStore.delete(k);
    }

    // Try real SMS, fall back to dev mode on any error
    try {
      await sendSms(phone, code);
      return res.json({ success: true, message: '验证码已发送' });
    } catch (smsErr) {
      console.error('SMS send failed, falling back to dev mode:', smsErr.message);
      return res.json({ success: true, message: '验证码已生成（开发模式）', devCode: code });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { phone, code, password, username } = req.body;

    if (phone) {
      if (!code) return res.status(400).json({ error: '请输入短信验证码' });
      if (!password || password.length < 6) return res.status(400).json({ error: '密码长度至少 6 位' });
      if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

      const stored = codeStore.get(phone);
      if (!stored || stored.code !== code || stored.expiresAt < Date.now()) {
        return res.status(400).json({ error: '验证码错误或已过期' });
      }
      codeStore.delete(phone);

      const hash = await hashPassword(password);
      const user = createUserByPhone(phone, hash);
      const token = signToken(user);
      return res.json({ success: true, token, user: { id: user.id, username: user.username, phone: user.phone } });
    }

    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名长度需在 2-20 个字符之间' });
    if (password.length < 6) return res.status(400).json({ error: '密码长度至少 6 位' });

    const hash = await hashPassword(password);
    const user = createUser(username, hash);
    const token = signToken(user);
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (err) {
    if (err.message === '该手机号已注册' || err.message === '用户名已存在') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    if ((!username && !phone) || !password) return res.status(400).json({ error: '请填写账号和密码' });

    let user;
    if (phone) user = getUserByPhone(phone);
    else user = getUserByUsername(username);

    if (!user) return res.status(401).json({ error: '账号或密码错误' });
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '账号或密码错误' });

    const token = signToken(user);
    res.json({ success: true, token, user: { id: user.id, username: user.username, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

module.exports = router;
