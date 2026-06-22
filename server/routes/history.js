const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getHistoryList,
  getHistoryById,
  deleteHistory,
  updateHistoryStatus,
} = require('../services/storage');
const { getPendingExternalTasks, markTaskCompleted, markTaskFailed } = require('../services/tasks');
const { getTaskStatus } = require('../services/img65535');

router.use(authMiddleware);

router.get('/', authMiddleware.requirePermission('history.view'), (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = getHistoryList(req.user.id, page, pageSize);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware.requirePermission('history.view'), (req, res) => {
  try {
    const record = getHistoryById(req.user.id, parseInt(req.params.id));
    if (!record) return res.status(404).json({ error: '记录不存在' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware.requirePermission('history.view'), (req, res) => {
  try {
    deleteHistory(req.user.id, parseInt(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware.requirePermission('history.view'), (req, res) => {
  try {
    updateHistoryStatus(req.user.id, parseInt(req.params.id), req.body);
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', authMiddleware.requirePermission('history.view'), async (req, res) => {
  try {
    const pending = getPendingExternalTasks().filter(task => task.user_id === req.user.id);
    const updated = [];

    for (const task of pending) {
      try {
        const status = await getTaskStatus(task.external_job_id, task.user_id);
        if (status.status === 'done') {
          markTaskCompleted(task.id, {
            output_json: status,
            progress_message: '历史同步：图片任务已完成',
          });
          if (task.history_id) {
            updateHistoryStatus(task.user_id, task.history_id, {
              status: 'completed',
              generated_images: status.resultUrls,
              job_id: task.external_job_id,
              task_id: task.id,
            });
          }
          updated.push({ id: task.history_id, taskId: task.id, status: 'completed' });
        } else if (status.status === 'failed') {
          markTaskFailed(task.id, new Error(status.errorMessage || '历史同步：图片任务失败'), {
            output_json: status,
          });
          if (task.history_id) {
            updateHistoryStatus(task.user_id, task.history_id, {
              status: 'failed',
              job_id: task.external_job_id,
              task_id: task.id,
            });
          }
          updated.push({ id: task.history_id, taskId: task.id, status: 'failed' });
        }
      } catch (e) {
        console.error(`Sync history task #${task.id} failed:`, e.message);
      }
    }

    res.json({ success: true, synced: updated.length, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
