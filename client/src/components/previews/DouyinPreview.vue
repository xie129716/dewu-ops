<template>
  <div class="platform-preview card">
    <div class="preview-header">
      <div>
        <h3>抖音脚本预览</h3>
        <p>短视频带货脚本 / 口播 / 分镜</p>
      </div>
      <span class="tag tag-blue">Douyin</span>
    </div>

    <div class="phone-frame">
      <div class="video-stage">
        <div class="video-overlay">
          <div class="video-badge">3s Hook</div>
          <div class="video-hook">{{ data.hook || '等待生成抖音钩子...' }}</div>
          <div class="video-caption">{{ data.caption || data.scriptTitle || '等待生成视频文案...' }}</div>
        </div>
      </div>

      <div class="script-panel">
        <div class="preview-section" v-if="data.scriptTitle">
          <span class="section-label">脚本标题</span>
          <div class="section-content strong">{{ data.scriptTitle }}</div>
        </div>

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

const sceneList = computed(() => Array.isArray(props.data.scenes) ? props.data.scenes : []);
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

.video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0,0,0,0.65));
}

.video-badge {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: var(--dewu-radius-full);
  background: rgba(255,255,255,0.12);
  color: #fff;
  font-size: 11px;
  margin-bottom: 10px;
}

.video-hook {
  color: #fff;
  font-size: 22px;
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

.section-content.strong {
  color: var(--dewu-heading);
  font-weight: 700;
}

.multiline {
  white-space: pre-wrap;
}

.scene-list {
  padding-left: 18px;
  color: var(--dewu-text-secondary);
  line-height: 1.7;
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
