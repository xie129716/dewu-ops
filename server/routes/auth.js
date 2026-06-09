const express = require('express');
const router = express.Router();
const {
  hashPassword,
  verifyPassword,
  signToken,
  createUser,
  createUserByPhone,
  getUserByUsername,
  getUserByPhone,
  getUserById,
} = require('../services/auth');
const { sendSmsCode, checkSmsCode } = require('../services/sms');
const authMiddleware = require('../middleware/auth');

// In-memory fallback codes (only when PNV not configured)
const devCodes = new Map(); // phone -> { code, bizToken, expiresAt }

// Send SMS verification code
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: '手机号不能为空' });
    if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

    try {
      const result = await sendSmsCode(phone);
      return res.json({ success: true, message: result.message, bizToken: result.bizToken });
    } catch (smsErr) {
      console.error('PNV send failed:', smsErr.message);
      // Fallback: dev mode when PNV not configured
      if (smsErr.message.includes('未配置')) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const bizToken = 'dev_' + Date.now();
        devCodes.set(phone, { code, bizToken, expiresAt: Date.now() + 5 * 60 * 1000 });
        // Clean expired
        for (const [k, v] of devCodes) {
          if (v.expiresAt < Date.now()) devCodes.delete(k);
        }
        return res.json({
          success: true,
          message: '验证码已生成（短信服务未配置，请使用下方验证码）',
          bizToken,
          devCode: code,
        });
      }
      return res.status(500).json({ error: `短信发送失败: ${smsErr.message}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { phone, code, bizToken, password, username } = req.body;

    // Phone-based registration (with SMS verification)
    if (phone) {
      if (!code) return res.status(400).json({ error: '请输入短信验证码' });
      if (!bizToken) return res.status(400).json({ error: '缺少验证令牌，请重新获取验证码' });
      if (!password || password.length < 6) return res.status(400).json({ error: '密码长度至少 6 位' });
      if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

      // Verify code
      let verified = false;
      try {
        verified = await checkSmsCode(phone, code, bizToken);
      } catch (e) {
        // Dev mode fallback
        if (bizToken.startsWith('dev_')) {
          const dev = devCodes.get(phone);
          verified = dev && dev.code === code && dev.bizToken === bizToken && dev.expiresAt > Date.now();
          if (verified) devCodes.delete(phone);
        } else {
          throw e;
        }
      }

      if (!verified) {
        return res.status(400).json({ error: '验证码错误或已过期' });
      }

      const hash = await hashPassword(password);
      const user = createUserByPhone(phone, hash);
      const token = signToken(user);
      return res.json({ success: true, token, user: { id: user.id, username: user.username, phone: user.phone } });
    }

    // Username-based registration (legacy, no SMS)
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

// Login (supports username or phone)
router.post('/login', async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    if ((!username && !phone) || !password) return res.status(400).json({ error: '请填写账号和密码' });

    let user;
    if (phone) {
      user = getUserByPhone(phone);
    } else {
      user = getUserByUsername(username);
    }

    if (!user) return res.status(401).json({ error: '账号或密码错误' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '账号或密码错误' });

    const token = signToken(user);
    res.json({
      success: true, token,
      user: { id: user.id, username: user.username, phone: user.phone },
    });
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
