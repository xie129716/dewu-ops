<template>
  <div class="history-page page-container">
    <div class="page-header">
      <h1>📁 历史记录</h1>
      <p>查看过往的商品识别、文案生成和图片生成记录</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" style="height:100px;width:100%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:100px;width:100%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:100px;width:100%"></div>
    </div>

    <div v-else-if="!records.length" class="empty-state card">
      <div class="empty-icon">📭</div>
      <p>暂无历史记录</p>
      <p class="empty-hint">去工作台生成你的第一条内容吧</p>
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

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="btn btn-ghost btn-sm" :disabled="page <= 1" @click="loadPage(page - 1)">
        ← 上一页
      </button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost btn-sm" :disabled="page >= totalPages" @click="loadPage(page + 1)">
        下一页 →
      </button>
    </div>

    <!-- Preview Modal -->
    <Teleport to="body">
      <div v-if="previewRecord" class="modal-overlay" @click.self="closePreview">
        <div class="modal-container">
          <button class="modal-close" @click="closePreview">✕</button>
          <div class="modal-body">
            <DewuPostPreview
              :generated-images="previewRecord.generated_images || []"
              :brand="previewRecord.recognition_result?.brand"
              :product-name="previewRecord.recognition_result?.productName"
              :category="previewRecord.recognition_result?.category"
              :title="previewRecord.copy_result?.title"
              :content="previewRecord.copy_result?.content"
              :tags="previewRecord.copy_result?.tags || []"
              :hashtags="previewRecord.copy_result?.hashtags || []"
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
import DewuPostPreview from '@/components/DewuPostPreview.vue';
import { downloadImage } from '@/utils/download';

const records = ref([]);
const loading = ref(true);
const page = ref(1);
const totalPages = ref(1);
const previewRecord = ref(null);

async function loadPage(p) {
  page.value = p;
  loading.value = true;
  try {
    // Sync pending records first
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
    const result = await api.post('/history/sync');
    if (result.synced > 0) {
      console.log(`Synced ${result.synced} pending records`);
    }
  } catch (e) {
    // Silently fail — sync is best-effort
    console.error('Sync failed:', e);
  }
}

async function handleDelete(id) {
  if (!confirm('确认删除这条记录？')) return;
  try {
    await api.delete(`/history/${id}`);
    records.value = records.value.filter(r => r.id !== id);
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
  downloadImage(url, filename);
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

/* --- Modal --- */
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
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 12px;
}

.modal-close {
  position: sticky;
  top: 8px;
  right: 0;
  float: right;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.7);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: -36px;
}
.modal-close:hover { background: rgba(255,255,255,0.2); }

.modal-body {
  /* DewuPostPreview handles its own styling */
}
</style>
