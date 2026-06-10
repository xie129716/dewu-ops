<template>
  <div class="uploader-card card">
    <div class="card-header">
      <h3>📷 上传商品图片</h3>
      <span v-if="imageUrl" class="tag tag-green">已上传</span>
    </div>

    <div
      class="drop-zone"
      :class="{ 'drop-zone--active': dragging, 'drop-zone--has-image': imageUrl, 'drop-zone--uploading': uploading }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- Uploading state -->
      <template v-if="uploading">
        <div class="upload-animation">
          <div class="upload-spinner"></div>
          <p class="upload-text">上传中...</p>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill"></div>
          </div>
        </div>
      </template>

      <template v-else-if="!imageUrl">
        <div class="drop-icon">📤</div>
        <p class="drop-text">拖拽图片到此处，或点击上传</p>
        <p class="drop-hint">支持 JPG / PNG / WebP，最大 50MB</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="file-input"
          @change="handleFileChange"
        />
        <button class="btn btn-ghost btn-sm" @click="$refs.fileInput.click()">
          选择文件
        </button>
      </template>

      <template v-else>
        <img :src="imageUrl" class="preview-image" alt="上传预览" />
        <div class="image-overlay">
          <button class="btn btn-sm" style="background:rgba(0,0,0,0.6);color:#fff" @click="clearImage">
            重新上传
          </button>
        </div>
      </template>
    </div>

    <div v-if="imageUrl" class="image-info">
      <span>📄 {{ originalName }}</span>
      <span v-if="fileSize">📏 {{ formatSize(fileSize) }}</span>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: { type: Object, default: null },
  uploading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const emit = defineEmits(['upload']);

const fileInput = ref(null);
const dragging = ref(false);

const imageUrl = computed(() => props.modelValue?.imageUrl || '');
const originalName = computed(() => props.modelValue?.originalName || '');
const fileSize = computed(() => props.modelValue?.size || 0);

function handleDrop(e) {
  dragging.value = false;
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileChange(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    alert('文件大小不能超过 50MB');
    return;
  }
  emit('upload', file);
}

function clearImage() {
  emit('upload', null);
  if (fileInput.value) fileInput.value.value = '';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
</script>

<style scoped>
.uploader-card {
  min-width: 320px;
}

.drop-zone {
  border: 2px dashed #333;
  border-radius: var(--dewu-radius);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: #666;
  background: rgba(255, 255, 255, 0.02);
}

.drop-zone--has-image {
  border-style: solid;
  padding: 0;
  overflow: hidden;
}

.drop-icon {
  font-size: 48px;
  opacity: 0.4;
}

.drop-text {
  font-size: 16px;
  color: var(--dewu-text-secondary);
}

.drop-hint {
  font-size: 12px;
  color: var(--dewu-text-muted);
}

.file-input {
  display: none;
}

.preview-image {
  width: 100%;
  height: 280px;
  object-fit: contain;
  background: #000;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.drop-zone:hover .image-overlay {
  opacity: 1;
}

.image-info {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 13px;
  color: var(--dewu-text-secondary);
}

.error-msg {
  margin-top: 12px;
  color: var(--dewu-accent);
  font-size: 13px;
}

/* Upload animation */
.drop-zone--uploading {
  border-color: var(--dewu-blue) !important;
  background: rgba(24, 144, 255, 0.03) !important;
}

.upload-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #222;
  border-top-color: var(--dewu-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.upload-text {
  font-size: 16px;
  color: var(--dewu-blue);
  font-weight: 600;
  animation: pulse-text 1.5s ease-in-out infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.progress-bar-wrap {
  width: 60%;
  height: 4px;
  background: #222;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, var(--dewu-blue), #69c0ff);
  border-radius: 2px;
  animation: progress-indeterminate 1.2s ease-in-out infinite;
}

@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
</style>
