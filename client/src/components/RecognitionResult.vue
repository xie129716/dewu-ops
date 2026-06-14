<template>
  <div class="card recog-card">
    <div class="card-header">
      <h3>🔍 识别结果</h3>
      <span v-if="data" class="tag" :class="confidenceTagClass">
        {{ confidenceLabel }}
      </span>
    </div>

    <div v-if="!data && !loading" class="empty-state">
      等待商品识别...
    </div>

    <div v-if="loading || data?.streaming" class="loading-state">
      <div class="streaming-spinner"></div>
      <p>AI 正在识别商品...</p>
    </div>

    <div v-if="data && !data.streaming && !loading" class="recog-content">
      <div class="recog-field">
        <span class="field-label">品牌</span>
        <span class="field-value brand">{{ data.brand }}</span>
      </div>
      <div class="recog-field">
        <span class="field-label">商品名称</span>
        <span class="field-value product">{{ data.productName }}</span>
      </div>
      <div class="recog-field">
        <span class="field-label">品类</span>
        <span class="field-value">{{ data.category }}</span>
      </div>
      <div v-if="data.description" class="recog-field">
        <span class="field-label">特征</span>
        <span class="field-value desc">{{ data.description }}</span>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const confidenceTagClass = computed(() => {
  if (!props.data) return '';
  const c = props.data.confidence;
  if (c === 'high') return 'tag-green';
  if (c === 'medium') return '';
  return 'tag';
});

const confidenceLabel = computed(() => {
  if (!props.data) return '';
  const c = props.data.confidence;
  if (c === 'high') return '高置信度';
  if (c === 'medium') return '中等置信度';
  return '低置信度';
});
</script>

<style scoped>
.recog-card {
  min-width: 300px;
}

.empty-state,
.loading-state {
  color: var(--dewu-text-muted);
  font-size: 14px;
  padding: 20px 0;
  text-align: center;
}

.recog-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.recog-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  color: var(--dewu-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.field-value {
  font-size: 15px;
  color: var(--dewu-text);
}

.field-value.brand {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.field-value.product {
  font-size: 16px;
  font-weight: 600;
  color: var(--dewu-accent-hover);
}

.field-value.desc {
  font-size: 13px;
  color: var(--dewu-text-secondary);
}

.error-msg {
  color: var(--dewu-accent);
  font-size: 13px;
  margin-top: 8px;
}

.streaming-spinner {
  width: 32px; height: 32px;
  border: 3px solid #222;
  border-top-color: var(--dewu-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}
/* blink keyframes defined in dewu-theme.css */
</style>
