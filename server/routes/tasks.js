const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getTaskStatus } = require('../services/img65535');
const { updateHistoryStatus } = require('../services/storage');
const { cacheRemoteImages } = require('../services/assetCache');
const {
  listTasks,
  getPendingExternalTasks,
  getTaskWithEvents,
  markTaskCompleted,
  markTaskFailed,
  retryTask,
} = require('../services/tasks');

router.use(authMiddleware);

router.get('/', authMiddleware.requirePermission('task.view'), (req, res) => {
  try {
    const result = listTasks({
      userId: req.user.id,
      canManageAll: req.user.permissionKeys.includes('task.manage_all') || req.user.roleKeys.includes('super_admin'),
      status: req.query.status || '',
      platformKey: req.query.platformKey || '',
      page: parseInt(req.query.page || '1', 10),
      pageSize: parseInt(req.query.pageSize || '20', 10),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authMiddleware.requirePermission('task.view'), (req, res) => {
  try {
    const result = listTasks({
      userId: req.user.id,
      canManageAll: req.user.permissionKeys.includes('task.manage_all') || req.user.roleKeys.includes('super_admin'),
      page: 1,
      pageSize: 500,
    });
    const counts = result.list.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ total: result.total, counts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware.requirePermission('task.view'), (req, res) => {
  try {
    const task = getTaskWithEvents(parseInt(req.params.id, 10));
    if (!task) return res.status(404).json({ error: '任务不存在' });
    if (!req.user.permissionKeys.includes('task.manage_all') && !req.user.roleKeys.includes('super_admin') && task.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看该任务' });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/retry', authMiddleware.requireAnyPermission(['task.manage_all', 'workflow.run']), (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const current = getTaskWithEvents(taskId);
    if (!current) return res.status(404).json({ error: '任务不存在' });
    const canManageAll = req.user.permissionKeys.includes('task.manage_all') || req.user.roleKeys.includes('super_admin');
    if (!canManageAll && current.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权重试该任务' });
    }
    const task = retryTask(taskId);
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync-external', authMiddleware.requireAnyPermission(['task.view', 'task.manage_all']), async (req, res) => {
  try {
    const canManageAll = req.user.permissionKeys.includes('task.manage_all') || req.user.roleKeys.includes('super_admin');
    const pending = getPendingExternalTasks().filter(task => canManageAll || task.user_id === req.user.id);
    const updated = [];

    for (const task of pending) {
      try {
        const status = await getTaskStatus(task.external_job_id, task.user_id);
        if (status.status === 'done') {
          const localUrls = await cacheRemoteImages(status.resultUrls || []);
          const completedTask = markTaskCompleted(task.id, {
            output_json: { ...status, resultUrls: localUrls },
            progress_message: '外部图片任务已完成',
          });
          if (task.history_id) {
            updateHistoryStatus(task.user_id, task.history_id, {
              status: 'completed',
              generated_images: localUrls,
              job_id: task.external_job_id,
              task_id: task.id,
            });
          }
          updated.push({ id: task.id, status: 'completed', historyId: task.history_id, task: completedTask });
        } else if (status.status === 'failed') {
          const failedTask = markTaskFailed(task.id, new Error(status.errorMessage || '外部图片任务失败'), {
            output_json: status,
          });
          if (task.history_id) {
            updateHistoryStatus(task.user_id, task.history_id, {
              status: 'failed',
              job_id: task.external_job_id,
              task_id: task.id,
            });
          }
          updated.push({ id: task.id, status: 'failed', historyId: task.history_id, task: failedTask });
        }
      } catch (e) {
        console.error(`Sync task #${task.id} failed:`, e.message);
      }
    }

    res.json({ success: true, synced: updated.length, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
