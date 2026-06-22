<template>
  <div class="history-page page-container">
    <div class="page-header">
      <h1>历史记录</h1>
      <p>查看过往的多平台商品识别、内容生成与图片生成结果</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" style="height:100px;width:100%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:100px;width:100%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:100px;width:100%"></div>
    </div>

    <div v-else-if="!records.length" class="empty-state card">
      <div class="empty-icon">📭</div>
      <p>暂无历史记录</p>
      <p class="empty-hint">去工作台生成你的第一条多平台内容吧</p>
      <router-link to="/" class="btn btn-primary">前往工作台</router-link>
    </div>

    <div v-else class="history-list">
      <HistoryCard
        v-for="record in records"
        :key="record.id"
        :record="record"
        @preview="openPreview"
        @delete="handleDelete"
      />
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="btn btn-ghost btn-sm" :disabled="page <= 1" @click="loadPage(page - 1)">← 上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost btn-sm" :disabled="page >= totalPages" @click="loadPage(page + 1)">下一页 →</button>
    </div>

    <Teleport to="body">
      <div v-if="previewRecord" class="modal-overlay" @click.self="closePreview">
        <div class="modal-container card">
          <div class="card-header preview-header">
            <div>
              <h3>内容预览</h3>
              <p class="preview-meta">平台：{{ platformLabel(previewRecord.platform_key) }} · 任务 #{{ previewRecord.task_id || '--' }}</p>
            </div>
            <button class="btn btn-ghost btn-sm" @click="closePreview">关闭</button>
          </div>
          <div class="modal-body">
            <ContentPreview
              :platform-key="previewRecord.platform_key || 'dewu'"
              :generated-images="previewRecord.generated_images || []"
              :recognition-data="previewRecord.recognition_result || {}"
              :copy-data="previewRecord.copy_result || {}"
              @download="handleDownload"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api';
import HistoryCard from '@/components/HistoryCard.vue';
import ContentPreview from '@/components/ContentPreview.vue';
import { downloadImage } from '@/utils/download';

const records = ref([]);
const loading = ref(true);
const page = ref(1);
const totalPages = ref(1);
const previewRecord = ref(null);

const platformMap = {
  dewu: '得物',
  douyin: '抖音',
  xiaohongshu: '小红书',
  wechat_oa: '微信公众号',
};

async function loadPage(p) {
  page.value = p;
  loading.value = true;
  try {
    await syncPending();
    const data = await api.get('/history', { params: { page: p, pageSize: 10 } });
    records.value = data.list;
    totalPages.value = Math.ceil(data.total / data.pageSize);
  } catch (e) {
    console.error('Failed to load history:', e);
  } finally {
    loading.value = false;
  }
}

async function syncPending() {
  try {
    await api.post('/history/sync');
  } catch (e) {
    console.error('Sync failed:', e);
  }
}

async function handleDelete(id) {
  if (!confirm('确认删除这条记录？')) return;
  try {
    await api.delete(`/history/${id}`);
    records.value = records.value.filter(item => item.id !== id);
  } catch (e) {
    alert('删除失败: ' + e.message);
  }
}

function openPreview(record) {
  previewRecord.value = record;
}

function closePreview() {
  previewRecord.value = null;
}

function handleDownload(url, filename) {
  if (!url) return;
  downloadImage(url, filename || 'generated-image.png');
}

function platformLabel(key) {
  return platformMap[key] || key || '未指定';
}

onMounted(() => loadPage(1));
</script>

<style scoped>
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon { font-size: 48px; opacity: 0.3; }
.empty-hint { color: var(--dewu-text-muted); font-size: 13px; }
.loading-state { padding: 20px 0; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding: 16px 0;
}

.page-info { color: var(--dewu-text-muted); font-size: 13px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  width: min(960px, 100%);
  max-height: 90vh;
  overflow-y: auto;
}

.preview-header {
  align-items: flex-start;
}

.preview-meta {
  color: var(--dewu-text-muted);
  font-size: 12px;
  margin-top: 4px;
}

.modal-body {
  padding-top: 8px;
}
</style>
