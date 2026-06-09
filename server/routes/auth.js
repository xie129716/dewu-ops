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
const { sendSms } = require('../services/sms');
const { saveSmsCode, verifySmsCode } = require('../services/storage');
const authMiddleware = require('../middleware/auth');

// Send SMS verification code
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: '手机号不能为空' });
    if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    // Expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Save to DB
    saveSmsCode(phone, code, expiresAt);

    // Send real SMS (falls through silently in dev mode)
    try {
      await sendSms(phone, code);
      console.log(`SMS sent to ${phone}`);
    } catch (smsErr) {
      console.error('SMS send failed:', smsErr.message);
      // In development, still return the code so the user can test
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ success: true, message: '验证码已发送（开发模式）', devCode: code });
      }
      return res.status(500).json({ error: '短信发送失败，请稍后再试' });
    }

    res.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register with phone + code + password
router.post('/register', async (req, res) => {
  try {
    const { phone, code, password } = req.body;

    // Phone-based registration (with SMS code)
    if (phone) {
      if (!code) return res.status(400).json({ error: '请输入短信验证码' });
      if (!password || password.length < 6) return res.status(400).json({ error: '密码长度至少 6 位' });
      if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

      // Verify SMS code
      const valid = verifySmsCode(phone, code);
      if (!valid) return res.status(400).json({ error: '验证码错误或已过期' });

      const hash = await hashPassword(password);
      const user = createUserByPhone(phone, hash);
      const token = signToken(user);

      return res.json({ success: true, token, user: { id: user.id, username: user.username, phone: user.phone } });
    }

    // Username-based registration (legacy, no SMS)
    const { username } = req.body;
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

    if ((!username && !phone) || !password) {
      return res.status(400).json({ error: '请填写账号和密码' });
    }

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
      success: true,
      token,
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
