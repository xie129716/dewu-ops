<template>
  <div class="dashboard page-container">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1>工作台</h1>
          <p>上传商品图片，一键生成识图 → 文案 → 图片 → 得物帖子预览</p>
        </div>
        <div class="header-stats">
          <div class="stat-chip">
            <span class="stat-number">⭐</span>
            <span class="stat-value">{{ auth.points }}</span>
            <span class="stat-label">积分余额</span>
          </div>
        </div>
      </div>
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
          :uploading="workflow.processing"
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
        <!-- Check-in Card -->
        <div class="card checkin-card">
          <button
            class="btn btn-checkin full-width"
            :class="{ checked: checkedIn }"
            :disabled="checkedIn || checkingIn"
            @click="handleCheckin"
          >
            <span v-if="checkedIn">✅ 今日已签到</span>
            <span v-else>🎁 每日签到领取积分</span>
            <span class="checkin-bonus">+20 ⭐</span>
          </button>
        </div>

        <!-- Controls Card -->
        <div class="card">
          <div class="card-header">
            <h3>操作面板</h3>
          </div>

          <div class="control-group">
            <button
              class="btn btn-primary control-btn"
              :disabled="!workflow.uploadedImage || workflow.processing"
              @click="handleRecognize"
            >
              <span class="ctrl-icon">🔍</span>
              <span class="ctrl-text">
                <span class="ctrl-label">识图</span>
                <span class="ctrl-desc">识别商品品牌、型号、品类</span>
              </span>
              <span class="cost-tag free">免费</span>
            </button>

            <button
              class="btn btn-primary control-btn"
              :disabled="!workflow.recognition || workflow.processing"
              @click="handleGenerateCopy"
            >
              <span class="ctrl-icon">✍️</span>
              <span class="ctrl-text">
                <span class="ctrl-label">生成文案</span>
                <span class="ctrl-desc">AI 得物风格种草文案</span>
              </span>
              <span class="cost-tag">⭐ 4</span>
            </button>

            <button
              class="btn btn-primary control-btn"
              :disabled="!workflow.copy || workflow.processing"
              @click="handleGenerateImage"
            >
              <span class="ctrl-icon">🖼️</span>
              <span class="ctrl-text">
                <span class="ctrl-label">生成图片</span>
                <span class="ctrl-desc">AI 商品展示图生成</span>
              </span>
              <span class="cost-tag">⭐ 8</span>
            </button>
          </div>

          <div class="divider">
            <span>一键执行</span>
          </div>

          <button
            class="btn btn-accent control-btn full-width pipeline-btn"
            :disabled="!workflow.uploadedImage || workflow.processing"
            @click="handleRunPipeline"
          >
            🚀 一键生成全部
            <span class="cost-tag accent">⭐ 10</span>
          </button>

          <!-- Polling status -->
          <div
            v-if="workflow.imageJob && workflow.currentStep === 3 && !workflow.generatedImages.length"
            class="poll-status"
          >
            <div class="loading-spinner"></div>
            <p>图片生成中，自动轮询状态...</p>
            <p class="poll-job">Job: {{ workflow.imageJob.jobId }}</p>
          </div>

          <div v-if="workflow.error" class="error-box">
            ⚠️ {{ workflow.error }}
          </div>
        </div>

        <!-- Reset -->
        <button class="btn btn-ghost full-width" @click="handleReset">
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
          :tags="workflow.copy?.tags || []"
          :hashtags="workflow.copy?.hashtags || []"
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useWorkflowStore } from '@/stores/workflow';
import { useAuthStore } from '@/stores/auth';
import api from '@/api';
import ImageUploader from '@/components/ImageUploader.vue';
import RecognitionResult from '@/components/RecognitionResult.vue';
import CopyDisplay from '@/components/CopyDisplay.vue';
import ImageDisplay from '@/components/ImageDisplay.vue';
import DewuPostPreview from '@/components/DewuPostPreview.vue';
import WorkflowProgress from '@/components/WorkflowProgress.vue';
import { downloadImage } from '@/utils/download';

const workflow = useWorkflowStore();
const auth = useAuthStore();
const uploadError = ref('');
const checkedIn = ref(false);
const checkingIn = ref(false);
let pollTimer = null;

const toast = ref({ show: false, message: '', type: 'success' });

async function loadPoints() {
  try {
    const data = await api.get('/points/balance');
    checkedIn.value = data.checkedIn;
    auth.user.points = data.points;
  } catch (e) { /* ignore */ }
}

async function handleCheckin() {
  checkingIn.value = true;
  try {
    const data = await api.post('/points/checkin');
    auth.user.points = data.points;
    checkedIn.value = true;
    showToast('🎉 签到成功！+20 积分');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    checkingIn.value = false;
  }
}

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
    await auth.refreshPoints();
    showToast('文案生成完成 (-4 积分)');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleGenerateImage() {
  try {
    await workflow.generateImage();
    await auth.refreshPoints();
    startPolling();
    showToast('图片生成任务已提交 (-8 积分)');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleRunPipeline() {
  try {
    await workflow.runFullPipeline();
    await auth.refreshPoints();
    startPolling();
    showToast('全链路执行中 (-10 积分)');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

onMounted(() => loadPoints());
onUnmounted(() => stopPolling());
</script>

<style scoped>
/* ——— Header ——— */
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.header-stats {
  display: flex;
  gap: 12px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 24px;
  background: var(--dewu-card);
  border: 1px solid var(--dewu-border);
  border-radius: var(--dewu-radius);
  min-width: 120px;
}

.stat-chip .stat-number {
  font-size: 20px;
}

.stat-chip .stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--dewu-heading);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.stat-chip .stat-label {
  font-size: 11px;
  color: var(--dewu-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ——— Grid ——— */
.dashboard-grid {
  display: grid;
  grid-template-columns: 380px 240px 1fr;
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
  top: 72px;
}

/* ——— Check-in ——— */
.checkin-card {
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--dewu-border);
}

.btn-checkin {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: linear-gradient(
    135deg,
    rgba(242, 201, 76, 0.08),
    rgba(242, 201, 76, 0.15)
  );
  color: var(--dewu-gold);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-checkin:hover:not(:disabled) {
  background: linear-gradient(
    135deg,
    rgba(242, 201, 76, 0.12),
    rgba(242, 201, 76, 0.2)
  );
}

.btn-checkin.checked {
  background: rgba(255, 255, 255, 0.03);
  color: var(--dewu-text-muted);
  cursor: default;
}

.checkin-bonus {
  font-size: 12px;
  padding: 2px 8px;
  background: rgba(242, 201, 76, 0.15);
  border-radius: var(--dewu-radius-full);
  color: var(--dewu-gold);
  font-weight: 700;
}

.btn-checkin.checked .checkin-bonus {
  background: rgba(255, 255, 255, 0.05);
  color: var(--dewu-text-muted);
}

/* ——— Control Buttons ——— */
.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.control-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  text-align: left;
  justify-content: flex-start;
  font-weight: 500;
}

.ctrl-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.ctrl-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.ctrl-label {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.ctrl-desc {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.6;
  line-height: 1.3;
}

.pipeline-btn {
  padding: 14px 16px;
  font-size: 15px;
  justify-content: center;
}

/* ——— Cost Tags ——— */
.cost-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--dewu-radius-full);
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  color: var(--dewu-text-secondary);
  flex-shrink: 0;
}

.cost-tag.free {
  background: rgba(111, 207, 151, 0.1);
  color: var(--dewu-green);
}

.cost-tag.accent {
  background: rgba(255, 107, 53, 0.12);
  color: var(--dewu-accent);
}

/* ——— Divider ——— */
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
  font-weight: 500;
}

/* ——— Poll Status ——— */
.poll-status {
  margin-top: 16px;
  padding: 16px;
  background: rgba(126, 184, 218, 0.05);
  border: 1px solid rgba(126, 184, 218, 0.1);
  border-radius: var(--dewu-radius-sm);
  text-align: center;
}

.poll-job {
  font-size: 11px;
  color: var(--dewu-text-muted);
  font-family: 'SF Mono', 'Fira Code', monospace;
  margin-top: 4px;
}

/* ——— Error Box ——— */
.error-box {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 107, 53, 0.08);
  border: 1px solid rgba(255, 107, 53, 0.15);
  border-radius: var(--dewu-radius-sm);
  color: var(--dewu-accent);
  font-size: 13px;
}

/* ——— Utilities ——— */
.full-width { width: 100%; }

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--dewu-border);
  border-top-color: var(--dewu-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 8px;
}
</style>
