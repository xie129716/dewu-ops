const express = require('express');
const router = express.Router();
const {
  getHistoryList,
  getHistoryById,
  deleteHistory,
  updateHistoryStatus,
  getPendingHistory,
} = require('../services/storage');
const { getTaskStatus } = require('../services/img65535');

// List history
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = getHistoryList(page, pageSize);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single history
router.get('/:id', (req, res) => {
  try {
    const record = getHistoryById(parseInt(req.params.id));
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete history
router.delete('/:id', (req, res) => {
  try {
    deleteHistory(parseInt(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update history (e.g., after image generation completes)
router.patch('/:id', (req, res) => {
  try {
    const { status, generatedImages, jobId } = req.body;
    updateHistoryStatus(parseInt(req.params.id), status, generatedImages, jobId);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync pending history records with 65535 API
router.post('/sync', async (req, res) => {
  try {
    const pending = getPendingHistory();
    const updated = [];

    for (const record of pending) {
      try {
        const status = await getTaskStatus(record.job_id);
        if (status.status === 'done') {
          updateHistoryStatus(record.id, 'completed', status.resultUrls, record.job_id);
          updated.push({ id: record.id, status: 'completed', resultUrls: status.resultUrls });
        } else if (status.status === 'failed') {
          updateHistoryStatus(record.id, 'failed', null, record.job_id);
          updated.push({ id: record.id, status: 'failed', error: status.errorMessage });
        }
        // pending/running: leave as-is
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
