<template>
  <div class="card copy-card">
    <div class="card-header">
      <h3>✍️ 生成文案</h3>
      <span v-if="data" class="tag tag-blue">已生成</span>
    </div>

    <div v-if="!data && !loading" class="empty-state">等待文案生成...</div>

    <div v-if="loading || data?.streaming" class="loading-state">
      <div class="streaming-spinner"></div>
      <p>AI 正在生成文案...</p>
    </div>

    <div v-if="data && !data.streaming && !loading" class="copy-content">
      <template v-if="platformKey === 'douyin'">
        <h4 class="copy-title">{{ data.scriptTitle || '抖音脚本' }}</h4>
        <div class="copy-block"><span class="copy-label">钩子</span><p>{{ data.hook || '—' }}</p></div>
        <div class="copy-block"><span class="copy-label">口播</span><p class="prewrap">{{ data.voiceover || '—' }}</p></div>
        <div class="copy-block" v-if="sceneList.length"><span class="copy-label">分镜</span><ol><li v-for="scene in sceneList" :key="scene">{{ scene }}</li></ol></div>
        <div class="copy-block"><span class="copy-label">视频文案</span><p class="prewrap">{{ data.caption || '—' }}</p></div>
      </template>

      <template v-else-if="platformKey === 'wechat_oa'">
        <h4 class="copy-title">{{ data.articleTitle || '公众号文章' }}</h4>
        <div class="copy-block"><span class="copy-label">摘要</span><p>{{ data.summary || '—' }}</p></div>
        <div class="copy-block" v-if="outlineList.length"><span class="copy-label">提纲</span><ol><li v-for="item in outlineList" :key="item">{{ item }}</li></ol></div>
        <div class="copy-body" :class="{ expanded }" @click="expanded = !expanded">
          <p class="prewrap">{{ data.body || '' }}</p>
          <div v-if="!expanded && (data.body || '').length > 150" class="expand-hint">点击展开全文...</div>
        </div>
        <div class="copy-block"><span class="copy-label">CTA</span><p>{{ data.cta || '—' }}</p></div>
      </template>

      <template v-else>
        <h4 class="copy-title">{{ data.title || '内容标题' }}</h4>
        <div class="copy-body" :class="{ expanded }" @click="expanded = !expanded">
          <p>{{ data.content || '' }}</p>
          <div v-if="!expanded && (data.content || '').length > 150" class="expand-hint">点击展开全文...</div>
        </div>
        <div v-if="data.coverText" class="copy-block"><span class="copy-label">封面文案</span><p>{{ data.coverText }}</p></div>
        <div class="copy-tags">
          <span v-for="tag in tagList" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </template>

      <div class="copy-hashtags" v-if="hashtagList.length">
        <span v-for="ht in hashtagList" :key="ht" class="hashtag">{{ ht }}</span>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  platformKey: { type: String, default: 'dewu' },
});

const expanded = ref(false);
const tagList = computed(() => Array.isArray(props.data?.tags) ? props.data.tags : []);
const hashtagList = computed(() => Array.isArray(props.data?.hashtags) ? props.data.hashtags : []);
const sceneList = computed(() => Array.isArray(props.data?.scenes) ? props.data.scenes : []);
const outlineList = computed(() => Array.isArray(props.data?.outline) ? props.data.outline : []);
</script>

<style scoped>
.copy-card { min-width: 300px; }

.empty-state,
.loading-state {
  color: var(--dewu-text-muted);
  font-size: 14px;
  padding: 24px 0;
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
  color: var(--dewu-heading);
  letter-spacing: -0.01em;
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

.copy-body.expanded { max-height: none; }

.copy-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.copy-label {
  font-size: 12px;
  color: var(--dewu-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.prewrap {
  white-space: pre-wrap;
}

.copy-block p,
.copy-block ol {
  color: var(--dewu-text-secondary);
  line-height: 1.8;
}

.copy-block ol {
  padding-left: 18px;
}

.expand-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 0 0;
  background: linear-gradient(transparent, var(--dewu-card) 70%);
  color: var(--dewu-blue);
  font-size: 13px;
  font-weight: 500;
}

.copy-tags,
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
  width: 32px;
  height: 32px;
  border: 3px solid var(--dewu-border);
  border-top-color: var(--dewu-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
</style>
