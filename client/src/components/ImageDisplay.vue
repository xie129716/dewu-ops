<template>
  <div class="card img-card">
    <div class="card-header">
      <h3>🖼️ 生成图片</h3>
      <div class="header-actions">
        <span v-if="status === 'done'" class="tag tag-green">已完成</span>
        <span v-else-if="status === 'running'" class="tag tag-blue">生成中</span>
        <span v-else-if="status === 'pending'" class="tag">排队中</span>
      </div>
    </div>

    <div v-if="!images.length && !loading" class="empty-state">
      等待图片生成...
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ statusText }}</p>
    </div>

    <div v-if="images.length" class="image-grid">
      <div v-for="(img, i) in images" :key="i" class="image-item">
        <img :src="img.url" :alt="'生成图片 ' + (i + 1)" class="gen-image" />
        <div class="image-actions">
          <button class="btn btn-ghost btn-sm" @click="$emit('download', img.url, `dewu-${i + 1}.png`)">
            💾 下载
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  images: { type: Array, default: () => [] },
  status: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

defineEmits(['download']);

const statusText = computed(() => {
  if (props.status === 'pending') return '任务排队中，等待处理...';
  if (props.status === 'running') return '图片生成中，请耐心等待...';
  return '处理中...';
});
</script>

<style scoped>
.img-card {
  min-width: 300px;
}

.empty-state,
.loading-state {
  color: var(--dewu-text-muted);
  font-size: 14px;
  padding: 20px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #333;
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.image-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-item {
  position: relative;
  border-radius: var(--dewu-radius-sm);
  overflow: hidden;
  background: #000;
}

.gen-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.image-actions {
  position: absolute;
  bottom: 12px;
  right: 12px;
}

.error-msg {
  color: var(--dewu-accent);
  font-size: 13px;
  margin-top: 8px;
}
</style>
