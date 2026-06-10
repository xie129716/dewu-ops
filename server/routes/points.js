const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getUserPoints, checkinToday, hasCheckedInToday } = require('../services/storage');

router.use(authMiddleware);

// Get current points
router.get('/balance', (req, res) => {
  try {
    const points = getUserPoints(req.user.id);
    const checkedIn = hasCheckedInToday(req.user.id);
    res.json({ points, checkedIn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily check-in (+20 points)
router.post('/checkin', (req, res) => {
  try {
    const ok = checkinToday(req.user.id);
    if (!ok) return res.status(400).json({ error: '今日已签到' });
    const points = getUserPoints(req.user.id);
    res.json({ success: true, message: '签到成功，+20 积分', points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
