<template>
  <div class="history-row card" @click="$emit('preview', record)">
    <div class="row-thumb">
      <img v-if="record.original_image" :src="record.original_image" alt="原图" />
      <div v-else class="thumb-placeholder">📷</div>
    </div>

    <div class="row-info">
      <div class="info-brand" v-if="record.recognition_result?.brand">
        {{ record.recognition_result.brand }}
      </div>
      <div class="info-name">{{ titleText }}</div>
      <div class="info-meta">
        <span v-if="record.platform_key" class="meta-tag">{{ platformLabel }}</span>
        <span v-if="record.recognition_result?.category" class="meta-tag">{{ record.recognition_result.category }}</span>
        <span class="status-tag" :class="statusClass">{{ statusLabel }}</span>
      </div>
      <div class="info-time">{{ formatTime(record.created_at) }}</div>
      <div v-if="record.task_id" class="info-sub">任务 #{{ record.task_id }}</div>
    </div>

    <div class="row-actions" @click.stop>
      <button class="btn btn-accent btn-sm" @click="$emit('preview', record)">👁️ 预览</button>
      <button class="btn btn-ghost btn-sm" @click="$emit('delete', record.id)" title="删除">🗑️</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  record: { type: Object, required: true },
});

defineEmits(['preview', 'delete']);

const platformMap = {
  dewu: '得物',
  douyin: '抖音',
  xiaohongshu: '小红书',
  wechat_oa: '公众号',
};

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

const titleText = computed(() => {
  const copy = props.record.copy_result || {};
  return copy.title || copy.scriptTitle || copy.articleTitle || props.record.recognition_result?.productName || '未知商品';
});

const platformLabel = computed(() => platformMap[props.record.platform_key] || props.record.platform_key || '未指定');

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
  padding: 18px 24px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-row:hover {
  border-color: var(--dewu-border-hover);
  background: var(--dewu-card-hover);
}

.row-thumb {
  width: 96px;
  height: 96px;
  border-radius: var(--dewu-radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: #000;
  border: 1px solid var(--dewu-border);
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
  font-size: 28px;
  opacity: 0.25;
}

.row-info { flex: 1; min-width: 0; }

.info-brand {
  font-size: 12px;
  color: var(--dewu-accent-hover);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  margin-bottom: 2px;
}

.info-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--dewu-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.info-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 12px;
  color: var(--dewu-text-muted);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 10px;
  border-radius: var(--dewu-radius-full);
  font-weight: 500;
}

.status-tag {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: var(--dewu-radius-full);
  background: rgba(255, 255, 255, 0.04);
  color: var(--dewu-text-muted);
  font-weight: 500;
}

.status-tag.tag-green {
  background: rgba(111, 207, 151, 0.1);
  color: var(--dewu-green);
}

.status-tag.tag-blue {
  background: rgba(126, 184, 218, 0.1);
  color: var(--dewu-blue);
}

.status-tag.tag-red {
  background: rgba(255, 107, 53, 0.1);
  color: var(--dewu-accent);
}

.info-time {
  font-size: 12px;
  color: var(--dewu-text-muted);
  margin-top: 6px;
}

.info-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dewu-text-muted);
}

.row-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
}
</style>
