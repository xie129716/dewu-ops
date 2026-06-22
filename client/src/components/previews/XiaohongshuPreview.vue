<template>
  <div class="platform-preview card">
    <div class="preview-header">
      <div>
        <h3>小红书笔记预览</h3>
        <p>图文标题 / 正文 / 标签 / 封面文案</p>
      </div>
      <span class="tag" style="background: rgba(255,107,53,0.12); color: var(--dewu-accent)">XHS</span>
    </div>

    <div class="note-card">
      <div class="note-cover">
        <div class="cover-overlay">
          <div class="cover-copy">{{ data.coverText || data.title || '等待生成封面文案...' }}</div>
        </div>
      </div>

      <div class="note-body">
        <div class="author-row">
          <div class="author-avatar">薯</div>
          <div class="author-meta">
            <div class="author-name">种草研究员</div>
            <div class="author-sub">今天更新 · 图文笔记</div>
          </div>
        </div>

        <div class="title">{{ data.title || '等待生成标题...' }}</div>
        <div class="content multiline">{{ data.content || '等待生成正文...' }}</div>

        <div class="tag-list" v-if="tagList.length">
          <span v-for="tag in tagList" :key="tag" class="tag-chip">{{ tag }}</span>
        </div>

        <div class="hashtags" v-if="hashtagList.length">
          <span v-for="tag in hashtagList" :key="tag" class="hashtag">{{ tag }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: { type: Object, default: () => ({}) },
});

const tagList = computed(() => Array.isArray(props.data.tags) ? props.data.tags : []);
const hashtagList = computed(() => Array.isArray(props.data.hashtags) ? props.data.hashtags : []);
</script>

<style scoped>
.platform-preview {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.preview-header h3 {
  color: var(--dewu-heading);
  font-size: 18px;
  margin-bottom: 4px;
}

.preview-header p {
  color: var(--dewu-text-muted);
  font-size: 12px;
}

.note-card {
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  color: #222;
}

.note-cover {
  aspect-ratio: 4 / 5;
  background: linear-gradient(135deg, #f9d7c7, #f5b67a 55%, #e68354 100%);
  position: relative;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  padding: 22px;
  display: flex;
  align-items: flex-end;
}

.cover-copy {
  color: #fff;
  font-size: 24px;
  line-height: 1.35;
  font-weight: 800;
  text-shadow: 0 2px 12px rgba(0,0,0,0.2);
}

.note-body {
  padding: 18px;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.author-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ff4d4f;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.author-name {
  font-size: 14px;
  font-weight: 700;
  color: #222;
}

.author-sub {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #111;
  line-height: 1.5;
}

.content {
  color: #444;
  line-height: 1.8;
  margin-top: 10px;
}

.multiline {
  white-space: pre-wrap;
}

.tag-list,
.hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.tag-chip {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.05);
  color: #666;
  font-size: 12px;
}

.hashtag {
  color: #ff4d4f;
  font-size: 12px;
  font-weight: 600;
}
</style>
