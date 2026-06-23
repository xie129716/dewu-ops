<template>
  <div class="platform-preview card">
    <div class="preview-header">
      <div>
        <h3>公众号文章预览</h3>
        <p>标题 / 摘要 / 提纲 / 正文 / CTA</p>
      </div>
      <span class="tag tag-green">WeChat OA</span>
    </div>

    <div class="article-shell">
      <div v-if="heroImage" class="hero-wrap">
        <img :src="heroImage" alt="公众号头图" class="hero-image" />
      </div>

      <div class="article-meta">品牌内容实验室 · 图文推送</div>
      <div class="article-title">{{ data.articleTitle || '等待生成文章标题...' }}</div>
      <div class="article-author">作者：内容运营助手 · 阅读 1.2k</div>

      <div class="preview-section" v-if="data.summary">
        <span class="section-label">摘要</span>
        <div class="summary-box">{{ data.summary }}</div>
      </div>

      <div class="preview-section" v-if="outlineList.length">
        <span class="section-label">文章提纲</span>
        <ol class="outline-list">
          <li v-for="item in outlineList" :key="item">{{ item }}</li>
        </ol>
      </div>

      <div class="preview-section" v-if="data.body">
        <span class="section-label">正文</span>
        <div class="section-content multiline">{{ data.body }}</div>
      </div>

      <div class="inline-image-grid" v-if="galleryImages.length > 1">
        <div v-for="(img, index) in galleryImages.slice(1)" :key="index" class="inline-image-wrap">
          <img :src="img" alt="公众号插图" class="inline-image" />
        </div>
      </div>

      <div class="preview-section" v-if="data.cta">
        <span class="section-label">行动号召</span>
        <div class="cta-box">{{ data.cta }}</div>
      </div>

      <div class="keywords" v-if="keywordList.length">
        <span v-for="keyword in keywordList" :key="keyword" class="keyword">{{ keyword }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: { type: Object, default: () => ({}) },
  generatedImages: { type: Array, default: () => [] },
});

const outlineList = computed(() => Array.isArray(props.data.outline) ? props.data.outline : []);
const keywordList = computed(() => Array.isArray(props.data.keywords) ? props.data.keywords : []);
const galleryImages = computed(() => props.generatedImages.map(item => typeof item === 'string' ? item : item?.url).filter(Boolean));
const heroImage = computed(() => galleryImages.value[0] || '');
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

.article-shell {
  background: #fff;
  color: #222;
  border-radius: 16px;
  padding: 24px;
}

.hero-wrap {
  margin: -24px -24px 18px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #eee;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-meta {
  color: #999;
  font-size: 12px;
}

.article-title {
  font-size: 26px;
  font-weight: 800;
  color: #111;
  line-height: 1.4;
  margin-top: 10px;
}

.article-author {
  color: #999;
  font-size: 12px;
  margin-top: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  color: #777;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.section-content {
  color: #444;
  line-height: 1.9;
}

.summary-box {
  padding: 14px 16px;
  border-left: 4px solid #07c160;
  background: #f7fbf8;
  color: #333;
  line-height: 1.8;
}

.cta-box {
  padding: 14px 16px;
  background: #f5f7fa;
  border-radius: 12px;
  color: #222;
  font-weight: 600;
}

.multiline {
  white-space: pre-wrap;
}

.outline-list {
  padding-left: 18px;
  color: #444;
  line-height: 1.9;
}

.inline-image-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.inline-image-wrap {
  border-radius: 12px;
  overflow: hidden;
  background: #eee;
  aspect-ratio: 4 / 3;
}

.inline-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.keyword {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,0.05);
  color: #666;
  font-size: 12px;
}
</style>
