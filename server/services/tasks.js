const {
  createTask,
  updateTask,
  appendTaskEvent,
  getTaskById,
  listTasks,
  listTaskEvents,
  getPendingExternalTasks,
} = require('./storage');

function createQueuedTask(payload) {
  const task = createTask({
    ...payload,
    status: payload.status || 'queued',
  });
  appendTaskEvent(task.id, 'created', `任务已创建：${task.type}`, { source: task.source, status: task.status });
  return task;
}

function markTaskRunning(taskId, patch = {}) {
  const task = updateTask(taskId, {
    status: 'running',
    started_at: patch.started_at || new Date().toISOString(),
    progress_step: patch.progress_step || 'running',
    progress_message: patch.progress_message || '任务执行中',
    ...patch,
  });
  appendTaskEvent(taskId, 'running', task?.progress_message || '任务执行中', patch);
  return task;
}

function markTaskWaitingExternal(taskId, patch = {}) {
  const task = updateTask(taskId, {
    status: 'waiting_external',
    progress_step: patch.progress_step || 'waiting_external',
    progress_message: patch.progress_message || '等待外部任务完成',
    ...patch,
  });
  appendTaskEvent(taskId, 'waiting_external', task?.progress_message || '等待外部任务完成', patch);
  return task;
}

function markTaskCompleted(taskId, patch = {}) {
  const task = updateTask(taskId, {
    status: 'completed',
    finished_at: patch.finished_at || new Date().toISOString(),
    progress_step: patch.progress_step || 'completed',
    progress_message: patch.progress_message || '任务已完成',
    ...patch,
  });
  appendTaskEvent(taskId, 'completed', task?.progress_message || '任务已完成', patch);
  return task;
}

function markTaskFailed(taskId, error, patch = {}) {
  const task = updateTask(taskId, {
    status: 'failed',
    finished_at: patch.finished_at || new Date().toISOString(),
    progress_step: patch.progress_step || 'failed',
    progress_message: patch.progress_message || (error?.message || '任务失败'),
    error_json: error ? { message: error.message || String(error), stack: error.stack || '' } : patch.error_json || null,
    ...patch,
  });
  appendTaskEvent(taskId, 'failed', task?.progress_message || '任务失败', task?.error_json || patch.error_json || null);
  return task;
}

function retryTask(taskId) {
  const current = getTaskById(taskId);
  if (!current) return null;
  const nextAttempts = (current.attempts || 0) + 1;
  const task = updateTask(taskId, {
    status: 'queued',
    attempts: nextAttempts,
    started_at: null,
    finished_at: null,
    error_json: null,
    progress_step: 'queued',
    progress_message: '任务已重试，等待执行',
  });
  appendTaskEvent(taskId, 'retried', '任务已重试', { attempts: nextAttempts });
  return task;
}

function getTaskWithEvents(taskId) {
  const task = getTaskById(taskId);
  if (!task) return null;
  return {
    ...task,
    events: listTaskEvents(taskId),
  };
}

module.exports = {
  createQueuedTask,
  markTaskRunning,
  markTaskWaitingExternal,
  markTaskCompleted,
  markTaskFailed,
  retryTask,
  getTaskWithEvents,
  listTasks,
  getPendingExternalTasks,
};
