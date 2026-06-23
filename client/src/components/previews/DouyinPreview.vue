<template>
  <div class="platform-preview card">
    <div class="preview-header">
      <div>
        <h3>抖音脚本预览</h3>
        <p>短视频脚本 / 口播 / 分镜 / 插图</p>
      </div>
      <span class="tag tag-blue">Douyin</span>
    </div>

    <div class="phone-frame">
      <div class="video-stage" :class="{ empty: !coverImage }">
        <img v-if="coverImage" :src="coverImage" alt="抖音封面预览" class="cover-image" />
        <div class="video-overlay">
          <div class="video-title">{{ data.scriptTitle || '等待生成抖音标题...' }}</div>
          <div class="video-caption">{{ data.caption || '等待生成视频文案...' }}</div>
        </div>
      </div>

      <div class="script-panel">
        <div class="preview-section" v-if="data.voiceover">
          <span class="section-label">口播文案</span>
          <div class="section-content multiline">{{ data.voiceover }}</div>
        </div>

        <div class="preview-section" v-if="sceneList.length">
          <span class="section-label">分镜脚本</span>
          <ol class="scene-list">
            <li v-for="scene in sceneList" :key="scene">{{ scene }}</li>
          </ol>
        </div>

        <div class="image-strip" v-if="galleryImages.length > 1">
          <div v-for="(img, index) in galleryImages.slice(1)" :key="index" class="thumb-wrap">
            <img :src="img" alt="插图预览" class="thumb-image" />
          </div>
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
  generatedImages: { type: Array, default: () => [] },
});

const sceneList = computed(() => Array.isArray(props.data.scenes) ? props.data.scenes : []);
const hashtagList = computed(() => Array.isArray(props.data.hashtags) ? props.data.hashtags : []);
const galleryImages = computed(() => props.generatedImages.map(item => typeof item === 'string' ? item : item?.url).filter(Boolean));
const coverImage = computed(() => galleryImages.value[0] || '');
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

.phone-frame {
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid var(--dewu-border);
  background: #09090c;
}

.video-stage {
  position: relative;
  aspect-ratio: 9 / 16;
  background: radial-gradient(circle at top, rgba(255,107,53,0.25), transparent 35%), linear-gradient(180deg, #111 0%, #07070a 100%);
}

.video-stage.empty {
  background: radial-gradient(circle at top, rgba(255,107,53,0.25), transparent 35%), linear-gradient(180deg, #111 0%, #07070a 100%);
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
}

.video-title {
  color: #fff;
  font-size: 24px;
  line-height: 1.4;
  font-weight: 800;
  text-shadow: 0 2px 10px rgba(0,0,0,0.35);
}

.video-caption {
  color: rgba(255,255,255,0.82);
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.6;
}

.script-panel {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--dewu-text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.section-content {
  color: var(--dewu-text-secondary);
  line-height: 1.7;
}

.multiline {
  white-space: pre-wrap;
}

.scene-list {
  padding-left: 18px;
  color: var(--dewu-text-secondary);
  line-height: 1.7;
}

.image-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.thumb-wrap {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--dewu-border);
  background: #111;
  aspect-ratio: 1;
}

.thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hashtag {
  color: var(--dewu-blue);
  font-size: 12px;
  font-weight: 500;
}
</style>
