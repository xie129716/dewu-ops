const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getHistoryList,
  getHistoryById,
  deleteHistory,
  updateHistoryStatus,
  getPendingHistory,
} = require('../services/storage');
const { getTaskStatus } = require('../services/img65535');

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = getHistoryList(req.user.id, page, pageSize);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const record = getHistoryById(req.user.id, parseInt(req.params.id));
    if (!record) return res.status(404).json({ error: '记录不存在' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    deleteHistory(req.user.id, parseInt(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const { status, generatedImages, jobId } = req.body;
    updateHistoryStatus(req.user.id, parseInt(req.params.id), status, generatedImages, jobId);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const pending = getPendingHistory();
    const updated = [];

    for (const record of pending) {
      try {
        const status = await getTaskStatus(record.job_id, record.user_id);
        if (status.status === 'done') {
          updateHistoryStatus(record.user_id, record.id, 'completed', status.resultUrls, record.job_id);
          updated.push({ id: record.id, status: 'completed' });
        } else if (status.status === 'failed') {
          updateHistoryStatus(record.user_id, record.id, 'failed', null, record.job_id);
          updated.push({ id: record.id, status: 'failed' });
        }
      } catch (e) {
        console.error(`Sync history #${record.id} failed:`, e.message);
      }
    }

    res.json({ success: true, synced: updated.length, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
