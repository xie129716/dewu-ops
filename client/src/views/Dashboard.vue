<template>
  <div class="dashboard page-container">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1>多平台运营工作台</h1>
          <p>上传商品图片，生成抖音 / 小红书 / 公众号 / 得物等热门平台的带货内容与商品图</p>
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

    <WorkflowProgress :current-step="workflow.currentStep" :error="workflow.error" :processing="workflow.processing" />

    <div class="dashboard-grid">
      <div class="grid-left">
        <ImageUploader :model-value="workflow.uploadedImage" :uploading="workflow.processing" :error="uploadError" @upload="handleUpload" />

        <RecognitionResult
          :data="workflow.recognition"
          :loading="workflow.processing && workflow.currentStep === 1"
          :error="workflow.error && workflow.currentStep === 1 ? workflow.error : ''"
          @edit="openRecognitionDialog"
        />

        <CopyDisplay
          :data="workflow.copy"
          :platform-key="workflow.selectedPlatform"
          :loading="workflow.processing && workflow.currentStep === 2"
          :error="workflow.error && workflow.currentStep === 2 ? workflow.error : ''"
        />

        <ImageDisplay
          :images="workflow.generatedImages"
          :status="workflow.taskStatus || workflow.imageJob?.status"
          :task-id="workflow.taskId"
          :job-id="workflow.imageJob?.jobId"
          :loading="workflow.processing && workflow.currentStep === 3"
          :error="workflow.error && workflow.currentStep === 3 ? workflow.error : ''"
          @download="handleDownload"
        />
      </div>

      <div class="grid-center">
        <div class="card checkin-card">
          <button class="btn btn-checkin full-width" :class="{ checked: checkedIn }" :disabled="checkedIn || checkingIn" @click="handleCheckin">
            <span v-if="checkedIn">✅ 今日已签到</span>
            <span v-else>🎁 每日签到领取积分</span>
            <span class="checkin-bonus">+20 ⭐</span>
          </button>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>平台与模板</h3>
          </div>

          <div class="field-group">
            <label class="field-label">目标平台</label>
            <select class="input" v-model="workflow.selectedPlatform" @change="handlePlatformChange">
              <option v-for="platform in resolvedPlatforms" :key="platform.key" :value="platform.key">
                {{ platform.name }}
              </option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">内容模板</label>
            <select class="input" v-model="workflow.selectedTemplateId">
              <option :value="null">默认模板</option>
              <option v-for="template in resolvedTemplates" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
          </div>

          <div class="field-grid">
            <div class="field-group">
              <label class="field-label">目标人群</label>
              <input class="input" :value="workflow.templateVariables.audience" @input="workflow.updateTemplateVariable('audience', $event.target.value)" placeholder="例如：年轻潮流用户" />
            </div>
            <div class="field-group">
              <label class="field-label">语气风格</label>
              <input class="input" :value="workflow.templateVariables.tone" @input="workflow.updateTemplateVariable('tone', $event.target.value)" placeholder="例如：真实分享、强转化" />
            </div>
            <div class="field-group">
              <label class="field-label">CTA</label>
              <input class="input" :value="workflow.templateVariables.cta" @input="workflow.updateTemplateVariable('cta', $event.target.value)" placeholder="例如：引导收藏评论下单" />
            </div>
            <div class="field-group">
              <label class="field-label">使用场景</label>
              <input class="input" :value="workflow.templateVariables.scene" @input="workflow.updateTemplateVariable('scene', $event.target.value)" placeholder="例如：日常穿搭、通勤" />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">核心卖点</label>
            <textarea class="input textarea" :value="workflow.templateVariables.sellingPoints" @input="workflow.updateTemplateVariable('sellingPoints', $event.target.value)" placeholder="例如：舒适脚感、辨识度高、适合多场景穿搭"></textarea>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>操作面板</h3>
          </div>

          <div class="control-group">
            <button class="btn btn-primary control-btn" :disabled="!workflow.uploadedImage || workflow.processing" @click="handleRecognize">
              <span class="ctrl-icon">🔍</span>
              <span class="ctrl-text">
                <span class="ctrl-label">识图</span>
                <span class="ctrl-desc">识别商品品牌、型号、品类并允许人工校正</span>
              </span>
              <span class="cost-tag free">免费</span>
            </button>

            <button class="btn btn-primary control-btn" :disabled="!workflow.recognition || workflow.processing || !auth.hasPermission('copy.generate')" @click="handleGenerateCopy">
              <span class="ctrl-icon">✍️</span>
              <span class="ctrl-text">
                <span class="ctrl-label">生成文案</span>
                <span class="ctrl-desc">手动可读可改 Prompt，生成平台内容</span>
              </span>
              <span class="cost-tag">⭐ 4</span>
            </button>

            <button class="btn btn-primary control-btn" :disabled="!workflow.recognitionConfirmed || !workflow.copy || workflow.processing || !auth.hasPermission('image.generate')" @click="handleGenerateImage">
              <span class="ctrl-icon">🖼️</span>
              <span class="ctrl-text">
                <span class="ctrl-label">生成图片</span>
                <span class="ctrl-desc">预计等待约 3 分钟，退出后可到历史记录查看</span>
              </span>
              <span class="cost-tag">⭐ 8</span>
            </button>
          </div>

          <div class="divider"><span>自动化执行</span></div>

          <button class="btn btn-accent control-btn full-width pipeline-btn" :disabled="!workflow.uploadedImage || workflow.processing || !auth.hasPermission('workflow.run')" @click="handleRunPipeline">
            🚀 一键生成全部
            <span class="cost-tag accent">⭐ 10</span>
          </button>

          <button class="btn btn-ghost control-btn full-width manual-btn" :disabled="!workflow.uploadedImage || workflow.processing || !auth.hasPermission('workflow.run')" @click="handleManualWorkflow">
            🧩 手动 Prompt 全链路
          </button>

          <div v-if="workflow.taskId || workflow.imageJob?.jobId" class="task-info">
            <div class="task-line">任务 #{{ workflow.taskId || '--' }}</div>
            <div class="task-line">状态：{{ statusText }}</div>
            <div v-if="workflow.imageJob?.jobId" class="task-line mono">外部任务：{{ workflow.imageJob.jobId }}</div>
            <div v-if="workflow.imageJob?.jobId" class="task-tip">提示：图片生成通常约需 3 分钟，若中途退出可前往历史记录查看。</div>
          </div>

          <div v-if="workflow.error" class="error-box">⚠️ {{ workflow.error }}</div>
        </div>

        <button class="btn btn-ghost full-width" @click="handleReset">🔄 重新开始</button>
      </div>

      <div class="grid-right">
        <ContentPreview
          :platform-key="workflow.selectedPlatform"
          :generated-images="workflow.generatedImages"
          :recognition-data="workflow.recognition || {}"
          :copy-data="workflow.copy || {}"
          @download="handleDownload"
        />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="recognitionDialog.show" class="modal-overlay" @click.self="closeRecognitionDialog">
        <div class="modal-card card">
          <div class="card-header">
            <h3>确认识别结果</h3>
            <button class="btn btn-ghost btn-sm" @click="closeRecognitionDialog">关闭</button>
          </div>
          <div class="field-grid">
            <div class="field-group">
              <label class="field-label">品牌</label>
              <input v-model="recognitionDialog.form.brand" class="input" />
            </div>
            <div class="field-group">
              <label class="field-label">商品名称</label>
              <input v-model="recognitionDialog.form.productName" class="input" />
            </div>
            <div class="field-group">
              <label class="field-label">品类</label>
              <input v-model="recognitionDialog.form.category" class="input" />
            </div>
            <div class="field-group">
              <label class="field-label">置信度</label>
              <input v-model="recognitionDialog.form.confidence" class="input" />
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">特征</label>
            <textarea v-model="recognitionDialog.form.description" class="input textarea"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-accent" @click="confirmRecognitionDialog">确认无误</button>
            <button class="btn btn-ghost" @click="closeRecognitionDialog">取消</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="promptDialog.show" class="modal-overlay" @click.self="closePromptDialog">
        <div class="modal-card card">
          <div class="card-header">
            <h3>{{ promptDialog.title }}</h3>
            <button class="btn btn-ghost btn-sm" @click="closePromptDialog">关闭</button>
          </div>
          <div class="field-group">
            <label class="field-label">系统 Prompt</label>
            <textarea class="input textarea prompt-area" :value="promptDialog.systemPrompt" disabled></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">可编辑用户 Prompt</label>
            <textarea class="input textarea prompt-area" v-model="promptDialog.userPrompt"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-accent" :disabled="promptDialog.executing" @click="confirmPromptDialog">
              {{ promptDialog.executing ? '执行中...' : '确认执行' }}
            </button>
            <button class="btn btn-ghost" :disabled="promptDialog.executing" @click="closePromptDialog">取消</button>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useWorkflowStore } from '@/stores/workflow';
import { useAuthStore } from '@/stores/auth';
import api from '@/api';
import ImageUploader from '@/components/ImageUploader.vue';
import RecognitionResult from '@/components/RecognitionResult.vue';
import CopyDisplay from '@/components/CopyDisplay.vue';
import ImageDisplay from '@/components/ImageDisplay.vue';
import WorkflowProgress from '@/components/WorkflowProgress.vue';
import ContentPreview from '@/components/ContentPreview.vue';
import { downloadImage } from '@/utils/download';
import { getPlatformFallbacks, getTemplateFallbacks } from '@/utils/platformFallbacks';

const workflow = useWorkflowStore();
const auth = useAuthStore();
const uploadError = ref('');
const checkedIn = ref(false);
const checkingIn = ref(false);
let pollTimer = null;

const toast = ref({ show: false, message: '', type: 'success' });
const promptDialog = ref({
  show: false,
  mode: '',
  title: '',
  systemPrompt: '',
  userPrompt: '',
  executing: false,
});
const recognitionDialog = ref({
  show: false,
  form: {
    brand: '',
    productName: '',
    category: '',
    description: '',
    confidence: '',
  },
});

const statusText = computed(() => {
  const status = workflow.taskStatus || workflow.imageJob?.status;
  return {
    queued: '排队中',
    pending: '排队中',
    running: '执行中',
    waiting_external: '等待外部任务',
    completed: '已完成',
    done: '已完成',
    failed: '失败',
  }[status] || (status || '—');
});

const resolvedPlatforms = computed(() => {
  return workflow.availablePlatforms.length ? workflow.availablePlatforms : getPlatformFallbacks();
});

const resolvedTemplates = computed(() => {
  return workflow.availableTemplates.length ? workflow.availableTemplates : getTemplateFallbacks(workflow.selectedPlatform);
});

async function initWorkbench() {
  await Promise.all([loadPoints(), workflow.loadPlatforms()]);
  await workflow.loadTemplates(workflow.selectedPlatform);
}

async function loadPoints() {
  try {
    const data = await api.get('/points/balance');
    checkedIn.value = data.checkedIn;
    if (auth.user) auth.user.points = data.points;
  } catch (e) {
      /* ignore */
  }
}

async function handlePlatformChange() {
  workflow.setPlatform(workflow.selectedPlatform);
  await workflow.loadTemplates(workflow.selectedPlatform);
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
    downloadImage(url, filename || 'generated-image.png');
    showToast('下载开始');
  } catch (e) {
    showToast('下载失败', 'error');
  }
}

function handleReset() {
  stopPolling();
  workflow.reset();
  uploadError.value = '';
  closeRecognitionDialog();
  closePromptDialog();
  showToast('已重置');
}

async function handleRecognize() {
  try {
    const result = await workflow.recognizeProduct();
    recognitionDialog.value = {
      show: true,
      form: {
        brand: result.brand || '',
        productName: result.productName || '',
        category: result.category || '',
        description: result.description || '',
        confidence: result.confidence || '',
      },
    };
    showToast('识别完成，请确认结果后继续');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function openRecognitionDialog() {
  if (!workflow.recognition) return;
  recognitionDialog.value = {
    show: true,
    form: {
      brand: workflow.recognition.brand || '',
      productName: workflow.recognition.productName || '',
      category: workflow.recognition.category || '',
      description: workflow.recognition.description || '',
      confidence: workflow.recognition.confidence || '',
    },
  };
}

function confirmRecognitionDialog() {
  workflow.confirmRecognition({ ...recognitionDialog.value.form });
  closeRecognitionDialog();
  showToast('识别结果已确认，可继续生成文案与图片');
}

function closeRecognitionDialog() {
  recognitionDialog.value = {
    show: false,
    form: {
      brand: '',
      productName: '',
      category: '',
      description: '',
      confidence: '',
    },
  };
}

async function handleGenerateCopy() {
  if (!workflow.recognitionConfirmed) {
    openRecognitionDialog();
    showToast('请先确认识别结果，再生成文案');
    return;
  }
  try {
    const preview = await workflow.previewCopyPrompt();
    promptDialog.value = {
      show: true,
      mode: 'copy',
      title: `生成${platformTitle()}文案前确认 Prompt`,
      systemPrompt: preview.systemPrompt,
      userPrompt: preview.userPrompt,
      executing: false,
    };
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleGenerateImage() {
  if (!workflow.recognitionConfirmed) {
    openRecognitionDialog();
    showToast('请先确认识别结果，再生成图片');
    return;
  }
  try {
    const preview = await workflow.previewImagePrompt();
    promptDialog.value = {
      show: true,
      mode: 'image',
      title: `生成${platformTitle()}图片前确认 Prompt`,
      systemPrompt: preview.systemPrompt,
      userPrompt: preview.userPrompt,
      executing: false,
    };
    showToast('图片生成通常约需 3 分钟，如中途退出可前往历史记录查看');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleRunPipeline() {
  if (!workflow.recognitionConfirmed) {
    openRecognitionDialog();
    showToast('请先确认识别结果，再执行一键生成');
    return;
  }
  try {
    await workflow.runFullPipeline();
    await auth.refreshPoints();
    startPolling();
    showToast('全链路执行中，图片生成通常约需 3 分钟 (-10 积分)');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleManualWorkflow() {
  if (!workflow.recognitionConfirmed) {
    openRecognitionDialog();
    showToast('请先确认识别结果，再执行手动全链路');
    return;
  }
  try {
    const preview = await api.post('/workflow/preview', {
      imageUrl: workflow.uploadedImage?.imageUrl,
      platformKey: workflow.selectedPlatform,
      templateId: workflow.selectedTemplateId,
      variables: workflow.templateVariables,
    });
    workflow.copyPromptDraft = preview.copyPrompt;
    workflow.imagePromptDraft = preview.imagePrompt;
    promptDialog.value = {
      show: true,
      mode: 'manual-workflow',
      title: `手动全链路执行：先确认文案 Prompt`,
      systemPrompt: preview.copyPrompt.systemPrompt,
      userPrompt: preview.copyPrompt.userPrompt,
      executing: false,
    };
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function confirmPromptDialog() {
  promptDialog.value.executing = true;
  try {
    if (promptDialog.value.mode === 'copy') {
      await workflow.generateCopy({ promptOverride: promptDialog.value.userPrompt });
      await auth.refreshPoints();
      showToast('文案生成完成 (-4 积分)');
      closePromptDialog();
      return;
    }

    if (promptDialog.value.mode === 'image') {
      await workflow.generateImage({ promptOverride: promptDialog.value.userPrompt });
      await auth.refreshPoints();
      startPolling();
      showToast('图片生成任务已提交，预计约 3 分钟完成 (-8 积分)');
      closePromptDialog();
      return;
    }

    if (promptDialog.value.mode === 'manual-workflow') {
      const copyPromptOverride = promptDialog.value.userPrompt;
      const imagePreview = workflow.imagePromptDraft;
      promptDialog.value = {
        show: true,
        mode: 'manual-workflow-image',
        title: `手动全链路执行：再确认图片 Prompt`,
        systemPrompt: imagePreview?.systemPrompt || '',
        userPrompt: imagePreview?.userPrompt || '',
        executing: false,
      };
      workflow.copyPromptDraft = { ...workflow.copyPromptDraft, userPrompt: copyPromptOverride };
      return;
    }

    if (promptDialog.value.mode === 'manual-workflow-image') {
      await workflow.runManualWorkflow({
        copyPromptOverride: workflow.copyPromptDraft?.userPrompt || '',
        imagePromptOverride: promptDialog.value.userPrompt,
      });
      await auth.refreshPoints();
      startPolling();
      showToast('手动全链路执行中，图片生成通常约需 3 分钟 (-10 积分)');
      closePromptDialog();
    }
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    promptDialog.value.executing = false;
  }
}

function closePromptDialog() {
  promptDialog.value = {
    show: false,
    mode: '',
    title: '',
    systemPrompt: '',
    userPrompt: '',
    executing: false,
  };
}

function platformTitle() {
  const platform = workflow.availablePlatforms.find(item => item.key === workflow.selectedPlatform);
  return platform?.name || '目标平台';
}

onMounted(() => initWorkbench());
onUnmounted(() => stopPolling());
</script>

<style scoped>
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

.dashboard-grid {
  display: grid;
  grid-template-columns: 380px 320px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 1280px) {
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
  background: linear-gradient(135deg, rgba(242, 201, 76, 0.08), rgba(242, 201, 76, 0.15));
  color: var(--dewu-gold);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-checkin:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(242, 201, 76, 0.12), rgba(242, 201, 76, 0.2));
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

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 640px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}

.field-label {
  font-size: 12px;
  color: var(--dewu-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.textarea {
  min-height: 96px;
  resize: vertical;
}

.prompt-area {
  min-height: 140px;
}

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

.pipeline-btn,
.manual-btn {
  justify-content: center;
}

.manual-btn {
  margin-top: 10px;
}

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

.task-info {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: var(--dewu-radius-sm);
  border: 1px solid var(--dewu-border);
}

.task-line {
  color: var(--dewu-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.task-tip {
  margin-top: 6px;
  color: var(--dewu-gold);
  font-size: 12px;
  line-height: 1.6;
}

.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.error-box {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 107, 53, 0.08);
  border: 1px solid rgba(255, 107, 53, 0.15);
  border-radius: var(--dewu-radius-sm);
  color: var(--dewu-accent);
  font-size: 13px;
}

.full-width { width: 100%; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1100;
}

.modal-card {
  width: min(960px, 100%);
  max-height: 90vh;
  overflow: auto;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
