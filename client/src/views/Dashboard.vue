<template>
  <div class="dashboard page-container">
    <div class="page-header">
      <h1>📋 工作台</h1>
      <p>上传商品图片，一键生成识图 → 文案 → 图片 → 得物帖子预览</p>
    </div>

    <!-- Progress Bar -->
    <WorkflowProgress
      :current-step="workflow.currentStep"
      :error="workflow.error"
      :processing="workflow.processing"
    />

    <!-- Main Layout: 3-Column -->
    <div class="dashboard-grid">
      <!-- Left: Upload + Results -->
      <div class="grid-left">
        <ImageUploader
          :model-value="workflow.uploadedImage"
          :error="uploadError"
          @upload="handleUpload"
        />

        <RecognitionResult
          :data="workflow.recognition"
          :loading="workflow.processing && workflow.currentStep === 1"
          :error="workflow.error && workflow.currentStep === 1 ? workflow.error : ''"
        />

        <CopyDisplay
          :data="workflow.copy"
          :loading="workflow.processing && workflow.currentStep === 2"
          :error="workflow.error && workflow.currentStep === 2 ? workflow.error : ''"
        />

        <ImageDisplay
          :images="workflow.generatedImages"
          :status="workflow.imageJob?.status"
          :loading="workflow.processing && workflow.currentStep === 3"
          :error="workflow.error && workflow.currentStep === 3 ? workflow.error : ''"
          @download="handleDownload"
        />
      </div>

      <!-- Center: Controls -->
      <div class="grid-center">
        <div class="card">
          <div class="card-header">
            <h3>🎮 操作面板</h3>
          </div>

          <!-- Step-by-step buttons -->
          <div class="control-group">
            <button
              class="btn btn-primary btn-lg control-btn"
              :disabled="!workflow.uploadedImage || workflow.processing"
              @click="handleRecognize"
            >
              🔍 识图
            </button>

            <button
              class="btn btn-primary btn-lg control-btn"
              :disabled="!workflow.recognition || workflow.processing"
              @click="handleGenerateCopy"
            >
              ✍️ 生成文案
            </button>

            <button
              class="btn btn-primary btn-lg control-btn"
              :disabled="!workflow.copy || workflow.processing"
              @click="handleGenerateImage"
            >
              🖼️ 生成图片
            </button>
          </div>

          <div class="divider">
            <span>或者</span>
          </div>

          <!-- One-click pipeline -->
          <button
            class="btn btn-accent btn-lg control-btn full-width"
            :disabled="!workflow.uploadedImage || workflow.processing"
            @click="handleRunPipeline"
          >
            🚀 一键生成全部
          </button>

          <!-- Polling status for async image generation -->
          <div v-if="workflow.imageJob && workflow.currentStep === 3 && !workflow.generatedImages.length" class="poll-status">
            <div class="loading-spinner"></div>
            <p>图片生成中，自动轮询状态...</p>
            <p class="poll-job">Job ID: {{ workflow.imageJob.jobId }}</p>
          </div>

          <div v-if="workflow.error" class="error-box">
            ⚠️ {{ workflow.error }}
          </div>
        </div>

        <!-- Reset -->
        <button
          class="btn btn-ghost control-btn full-width"
          @click="handleReset"
        >
          🔄 重新开始
        </button>
      </div>

      <!-- Right: Dewu Post Preview -->
      <div class="grid-right">
        <DewuPostPreview
          :generated-images="workflow.generatedImages"
          :brand="workflow.recognition?.brand"
          :product-name="workflow.recognition?.productName"
          :category="workflow.recognition?.category"
          :title="workflow.copy?.title"
          :content="workflow.copy?.content"
          :tags="workflow.copy?.tags"
          :hashtags="workflow.copy?.hashtags"
          @download="handleDownload"
        />
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useWorkflowStore } from '@/stores/workflow';
import ImageUploader from '@/components/ImageUploader.vue';
import RecognitionResult from '@/components/RecognitionResult.vue';
import CopyDisplay from '@/components/CopyDisplay.vue';
import ImageDisplay from '@/components/ImageDisplay.vue';
import DewuPostPreview from '@/components/DewuPostPreview.vue';
import WorkflowProgress from '@/components/WorkflowProgress.vue';
import { downloadImage } from '@/utils/download';

const workflow = useWorkflowStore();
const uploadError = ref('');
let pollTimer = null;

const toast = ref({ show: false, message: '', type: 'success' });

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 3000);
}

async function handleUpload(file) {
  if (!file) {
    workflow.reset();
    uploadError.value = '';
    return;
  }
  uploadError.value = '';
  try {
    await workflow.uploadImage(file);
    workflow.currentStep = 1;
    showToast('图片上传成功');
  } catch (e) {
    uploadError.value = e.message;
    showToast(e.message, 'error');
  }
}

async function handleRecognize() {
  try {
    await workflow.recognizeProduct();
    showToast('商品识别完成');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleGenerateCopy() {
  try {
    await workflow.generateCopy();
    showToast('文案生成完成');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleGenerateImage() {
  try {
    await workflow.generateImage();
    startPolling();
    showToast('图片生成任务已提交');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleRunPipeline() {
  try {
    await workflow.runFullPipeline();
    startPolling();
    showToast('全链路执行中：识别+文案完成，图片生成中...');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const result = await workflow.pollImageStatus();
      if (result.status === 'done') {
        stopPolling();
        showToast('🎉 全部完成！');
      } else if (result.status === 'failed') {
        stopPolling();
        showToast(`图片生成失败: ${result.errorMessage}`, 'error');
      }
    } catch (e) {
      // Only stop on terminal errors
      if (e.message.includes('失败')) {
        stopPolling();
        showToast(e.message, 'error');
      }
    }
  }, 2000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function handleDownload(url, filename) {
  try {
    downloadImage(url, filename);
    showToast('下载开始');
  } catch (e) {
    showToast('下载失败', 'error');
  }
}

function handleReset() {
  stopPolling();
  workflow.reset();
  uploadError.value = '';
  showToast('已重置');
}

// Clean up polling on unmount
import { onUnmounted } from 'vue';
onUnmounted(() => stopPolling());
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: 380px 220px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.grid-left,
.grid-center,
.grid-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid-right {
  position: sticky;
  top: 80px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.control-btn {
  width: 100%;
}

.divider {
  text-align: center;
  position: relative;
  margin: 16px 0;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: var(--dewu-border);
}

.divider::before { left: 0; }
.divider::after { right: 0; }

.divider span {
  background: var(--dewu-card);
  padding: 0 12px;
  color: var(--dewu-text-muted);
  font-size: 12px;
}

.poll-status {
  margin-top: 16px;
  padding: 16px;
  background: rgba(24, 144, 255, 0.05);
  border-radius: var(--dewu-radius-sm);
  text-align: center;
}

.poll-job {
  font-size: 11px;
  color: var(--dewu-text-muted);
  font-family: monospace;
  margin-top: 4px;
}

.error-box {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 77, 79, 0.08);
  border-radius: var(--dewu-radius-sm);
  color: var(--dewu-accent);
  font-size: 13px;
}

.full-width {
  width: 100%;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #333;
  border-top-color: var(--dewu-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
