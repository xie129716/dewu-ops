<template>
  <div class="tasks-page page-container">
    <div class="page-header">
      <h1>任务中心</h1>
      <p>查看多平台内容生成任务、外部图片任务状态与失败重试</p>
    </div>

    <div class="stats-grid">
      <div class="card mini-stat">
        <div class="mini-stat-label">总任务</div>
        <div class="mini-stat-value">{{ stats.total }}</div>
      </div>
      <div class="card mini-stat">
        <div class="mini-stat-label">执行中</div>
        <div class="mini-stat-value">{{ stats.counts.running || 0 }}</div>
      </div>
      <div class="card mini-stat">
        <div class="mini-stat-label">等待外部</div>
        <div class="mini-stat-value">{{ stats.counts.waiting_external || 0 }}</div>
      </div>
      <div class="card mini-stat">
        <div class="mini-stat-label">失败</div>
        <div class="mini-stat-value">{{ stats.counts.failed || 0 }}</div>
      </div>
    </div>

    <div class="task-toolbar card">
      <div class="toolbar-row">
        <select v-model="filters.status" class="input compact" @change="loadTasks()">
          <option value="">全部状态</option>
          <option value="queued">排队中</option>
          <option value="running">执行中</option>
          <option value="waiting_external">等待外部任务</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
        </select>
        <select v-model="filters.platformKey" class="input compact" @change="loadTasks()">
          <option value="">全部平台</option>
          <option v-for="platform in platforms" :key="platform.key" :value="platform.key">{{ platform.name }}</option>
        </select>
        <button class="btn btn-ghost" @click="syncExternal">同步外部任务</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" style="height:90px;width:100%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:90px;width:100%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:90px;width:100%"></div>
    </div>

    <div v-else-if="!tasks.length" class="empty-state card">
      <div class="empty-icon">🧭</div>
      <p>暂无任务记录</p>
      <p class="empty-hint">回到工作台发起你的第一条多平台内容任务</p>
    </div>

    <div v-else class="task-list">
      <div v-for="task in tasks" :key="task.id" class="task-card card">
        <div class="task-main">
          <div class="task-topline">
            <div class="task-title">#{{ task.id }} · {{ task.type }}</div>
            <span class="task-status" :class="`status-${task.status}`">{{ statusText(task.status) }}</span>
          </div>
          <div class="task-meta">
            <span class="meta-chip">平台：{{ platformName(task.platform_key) }}</span>
            <span v-if="task.source" class="meta-chip">来源：{{ task.source }}</span>
            <span v-if="task.external_job_id" class="meta-chip mono">外部任务：{{ task.external_job_id }}</span>
          </div>
          <div class="task-message">{{ task.progress_message || '暂无进度信息' }}</div>
          <div class="task-time">创建于 {{ formatTime(task.created_at) }}</div>
        </div>
        <div class="task-actions">
          <button class="btn btn-ghost btn-sm" @click="openTask(task.id)">详情</button>
          <button v-if="task.status === 'failed' || task.status === 'cancelled'" class="btn btn-accent btn-sm" @click="retry(task.id)">重试</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="activeTask" class="modal-overlay" @click.self="activeTask = null">
        <div class="modal-card card">
          <div class="card-header">
            <h3>任务详情 #{{ activeTask.id }}</h3>
            <button class="btn btn-ghost btn-sm" @click="activeTask = null">关闭</button>
          </div>
          <div class="detail-block">
            <pre class="detail-pre">{{ JSON.stringify(activeTask, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api';

const tasks = ref([]);
const platforms = ref([]);
const activeTask = ref(null);
const loading = ref(true);
const filters = ref({ status: '', platformKey: '' });
const stats = ref({ total: 0, counts: {} });

async function loadPlatforms() {
  try {
    const data = await api.get('/platforms');
    platforms.value = data.list || [];
  } catch (e) {
    platforms.value = [];
  }
}

async function loadTasks() {
  loading.value = true;
  try {
    const [taskData, statsData] = await Promise.all([
      api.get('/tasks', { params: { status: filters.value.status, platformKey: filters.value.platformKey } }),
      api.get('/tasks/stats'),
    ]);
    tasks.value = taskData.list || [];
    stats.value = statsData || { total: 0, counts: {} };
  } finally {
    loading.value = false;
  }
}

async function openTask(id) {
  activeTask.value = await api.get(`/tasks/${id}`);
}

async function retry(id) {
  await api.post(`/tasks/${id}/retry`);
  await loadTasks();
}

async function syncExternal() {
  await api.post('/tasks/sync-external');
  await loadTasks();
}

function statusText(status) {
  return {
    queued: '排队中',
    running: '执行中',
    waiting_external: '等待外部任务',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  }[status] || status;
}

function platformName(key) {
  return platforms.value.find(item => item.key === key)?.name || key || '未指定';
}

function formatTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  return date.toLocaleString('zh-CN');
}

onMounted(async () => {
  await Promise.all([loadPlatforms(), loadTasks()]);
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.mini-stat {
  padding: 18px 20px;
}

.mini-stat-label {
  color: var(--dewu-text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mini-stat-value {
  margin-top: 8px;
  color: var(--dewu-heading);
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.task-toolbar {
  margin-bottom: 20px;
}

.toolbar-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.compact {
  width: 180px;
}

.loading-state {
  padding: 12px 0;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.task-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dewu-heading);
}

.task-status {
  padding: 2px 10px;
  border-radius: var(--dewu-radius-full);
  font-size: 12px;
  font-weight: 600;
}

.status-queued { background: rgba(255,255,255,0.06); color: var(--dewu-text-secondary); }
.status-running { background: rgba(126,184,218,0.12); color: var(--dewu-blue); }
.status-waiting_external { background: rgba(242,201,76,0.12); color: var(--dewu-gold); }
.status-completed { background: rgba(111,207,151,0.12); color: var(--dewu-green); }
.status-failed { background: rgba(255,107,53,0.12); color: var(--dewu-accent); }
.status-cancelled { background: rgba(255,255,255,0.06); color: var(--dewu-text-muted); }

.task-meta {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-chip {
  padding: 2px 10px;
  border-radius: var(--dewu-radius-full);
  background: rgba(255,255,255,0.05);
  color: var(--dewu-text-secondary);
  font-size: 12px;
}

.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.task-message {
  margin-top: 10px;
  color: var(--dewu-text-secondary);
}

.task-time {
  margin-top: 8px;
  color: var(--dewu-text-muted);
  font-size: 12px;
}

.task-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 56px 20px;
}

.empty-icon { font-size: 40px; opacity: 0.3; margin-bottom: 12px; }
.empty-hint { color: var(--dewu-text-muted); font-size: 13px; margin-top: 6px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-card {
  width: min(900px, 100%);
  max-height: 90vh;
  overflow: auto;
}

.detail-pre {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--dewu-text-secondary);
  font-size: 12px;
  line-height: 1.7;
}
</style>
