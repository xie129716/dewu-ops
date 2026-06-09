const express = require('express');
const router = express.Router();
const {
  getHistoryList,
  getHistoryById,
  deleteHistory,
  updateHistoryStatus,
} = require('../services/storage');

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
    const { status, generatedImages } = req.body;
    updateHistoryStatus(parseInt(req.params.id), status, generatedImages);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
