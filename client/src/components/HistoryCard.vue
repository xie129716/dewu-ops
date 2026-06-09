<template>
  <div class="history-row card" @click="$emit('preview', record)">
    <!-- Left: Original image thumbnail -->
    <div class="row-thumb">
      <img v-if="record.original_image" :src="record.original_image" alt="原图" />
      <div v-else class="thumb-placeholder">📷</div>
    </div>

    <!-- Center: Product info -->
    <div class="row-info">
      <div class="info-brand" v-if="record.recognition_result?.brand">
        {{ record.recognition_result.brand }}
      </div>
      <div class="info-name">
        {{ record.recognition_result?.productName || '未知商品' }}
      </div>
      <div class="info-meta">
        <span v-if="record.recognition_result?.category" class="meta-tag">
          {{ record.recognition_result.category }}
        </span>
        <span class="status-tag" :class="statusClass">{{ statusLabel }}</span>
      </div>
      <div class="info-time">{{ formatTime(record.created_at) }}</div>
    </div>

    <!-- Right: Preview button + actions -->
    <div class="row-actions" @click.stop>
      <button class="btn btn-accent btn-sm" @click="$emit('preview', record)">
        👁️ 预览
      </button>
      <button class="btn btn-ghost btn-sm" @click="$emit('delete', record.id)" title="删除">
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  record: { type: Object, required: true },
});

defineEmits(['preview', 'delete']);

const statusClass = computed(() => {
  switch (props.record.status) {
    case 'completed': return 'tag-green';
    case 'pending_image': return 'tag-blue';
    case 'failed': return 'tag-red';
    default: return '';
  }
});

const statusLabel = computed(() => {
  switch (props.record.status) {
    case 'completed': return '已完成';
    case 'pending_image': return '等待生图';
    case 'failed': return '失败';
    default: return props.record.status;
  }
});

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<style scoped>
.history-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.history-row:hover {
  border-color: #444;
  background: rgba(255,255,255,0.02);
}

/* --- Thumbnail --- */
.row-thumb {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #000;
}

.row-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  opacity: 0.3;
}

/* --- Info --- */
.row-info {
  flex: 1;
  min-width: 0;
}

.info-brand {
  font-size: 12px;
  color: var(--dewu-accent-hover);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.info-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  align-items: center;
}

.meta-tag {
  font-size: 12px;
  color: #888;
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 4px;
}

.status-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  color: #888;
}

.status-tag.tag-green {
  background: rgba(82, 196, 26, 0.1);
  color: var(--dewu-green);
}

.status-tag.tag-blue {
  background: rgba(24, 144, 255, 0.1);
  color: var(--dewu-blue);
}

.status-tag.tag-red {
  background: rgba(255, 77, 79, 0.1);
  color: var(--dewu-accent);
}

.info-time {
  font-size: 12px;
  color: #555;
  margin-top: 4px;
}

/* --- Actions --- */
.row-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
}
</style>
