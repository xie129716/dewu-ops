<template>
  <div class="card copy-card">
    <div class="card-header">
      <h3>✍️ 生成文案</h3>
      <span v-if="data" class="tag tag-blue">已生成</span>
    </div>

    <div v-if="!data && !loading" class="empty-state">
      等待文案生成...
    </div>

    <div v-if="loading || data?.streaming" class="loading-state">
      <div class="streaming-spinner"></div>
      <p>AI 正在生成文案...</p>
    </div>

    <div v-if="data && !data.streaming && !loading" class="copy-content">
      <h4 class="copy-title">{{ data.title }}</h4>
      <div class="copy-body" :class="{ expanded }" @click="expanded = !expanded">
        <p>{{ data.content }}</p>
        <div v-if="!expanded && data.content.length > 150" class="expand-hint">
          点击展开全文...
        </div>
      </div>
      <div class="copy-tags">
        <span v-for="tag in data.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <div class="copy-hashtags">
        <span v-for="ht in data.hashtags" :key="ht" class="hashtag">{{ ht }}</span>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const expanded = ref(false);
</script>

<style scoped>
.copy-card {
  min-width: 300px;
}

.empty-state,
.loading-state {
  color: var(--dewu-text-muted);
  font-size: 14px;
  padding: 20px 0;
  text-align: center;
}

.copy-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.copy-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.copy-body {
  font-size: 14px;
  line-height: 1.8;
  color: var(--dewu-text-secondary);
  max-height: 120px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.copy-body.expanded {
  max-height: none;
}

.expand-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 0 0;
  background: linear-gradient(transparent, var(--dewu-card) 70%);
  color: var(--dewu-blue);
  font-size: 13px;
}

.copy-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.copy-hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hashtag {
  color: var(--dewu-blue);
  font-size: 13px;
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
</style>
