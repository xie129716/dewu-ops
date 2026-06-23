import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api';
import { consumeSSE } from '@/utils/sse';
import { parseJSON } from '@/utils/parse';
import { useAuthStore } from '@/stores/auth';
import { createLocalHistoryRecord, updateLocalHistoryRecord } from '@/utils/localHistory';
import { getPlatformFallbacks, getTemplateFallbacks } from '@/utils/platformFallbacks';

const DEFAULT_VARIABLES = {
  audience: '',
  tone: '',
  sellingPoints: '',
  cta: '',
  scene: '',
};

function compactRecognition(recognition) {
  if (!recognition) return null;
  const { brand, productName, category, description, confidence } = recognition;
  return { brand, productName, category, description, confidence };
}

function compactCopy(copy) {
  if (!copy) return null;
  const next = { ...copy };
  delete next.streaming;
  return next;
}

function mapImagesToUrls(images = []) {
  return images.map(item => (typeof item === 'string' ? item : item?.url)).filter(Boolean);
}

export const useWorkflowStore = defineStore('workflow', () => {
  const auth = useAuthStore();

  const uploadedImage = ref(null);
  const recognition = ref(null);
  const copy = ref(null);
  const imageJob = ref(null);
  const generatedImages = ref([]);
  const historyId = ref(null);
  const taskId = ref(null);
  const taskStatus = ref('');

  const selectedPlatform = ref('dewu');
  const selectedTemplateId = ref(null);
  const templateVariables = ref({ ...DEFAULT_VARIABLES });
  const availablePlatforms = ref([]);
  const availableTemplates = ref([]);
  const copyPromptDraft = ref(null);
  const imagePromptDraft = ref(null);

  const currentStep = ref(0);
  const error = ref(null);
  const processing = ref(false);
  const recognitionConfirmed = ref(false);

  function getLocalHistoryUserId() {
    return auth.user?.id || 'guest';
  }

  function upsertLocalHistory(patch = {}) {
    const userId = getLocalHistoryUserId();
    if (historyId.value) {
      const updated = updateLocalHistoryRecord(userId, historyId.value, patch);
      return updated;
    }

    const created = createLocalHistoryRecord(userId, {
      original_image: uploadedImage.value?.imageUrl || '',
      recognition_result: compactRecognition(recognition.value),
      copy_result: compactCopy(copy.value),
      generated_images: mapImagesToUrls(generatedImages.value),
      platform_key: selectedPlatform.value,
      template_id: selectedTemplateId.value,
      workflow_mode: 'manual',
      ...patch,
    });
    historyId.value = created.id;
    return created;
  }

  function reset() {
    uploadedImage.value = null;
    recognition.value = null;
    copy.value = null;
    imageJob.value = null;
    generatedImages.value = [];
    historyId.value = null;
    taskId.value = null;
    taskStatus.value = '';
    copyPromptDraft.value = null;
    imagePromptDraft.value = null;
    currentStep.value = 0;
    error.value = null;
    processing.value = false;
    recognitionConfirmed.value = false;
  }

  async function loadPlatforms() {
    try {
      const data = await api.get('/platforms');
      availablePlatforms.value = (data.list || []).filter(platform => platform.enabled !== false);
      if (!availablePlatforms.value.length) {
        availablePlatforms.value = getPlatformFallbacks();
      }
    } catch (_) {
      availablePlatforms.value = getPlatformFallbacks();
    }
    if (!availablePlatforms.value.find(platform => platform.key === selectedPlatform.value) && availablePlatforms.value.length) {
      selectedPlatform.value = availablePlatforms.value[0].key;
    }
    return availablePlatforms.value;
  }

  async function loadTemplates(platformKey = selectedPlatform.value) {
    try {
      const data = await api.get('/templates', { params: { platformKey } });
      availableTemplates.value = data.list || [];
      if (!availableTemplates.value.length) {
        availableTemplates.value = getTemplateFallbacks(platformKey);
      }
    } catch (_) {
      availableTemplates.value = getTemplateFallbacks(platformKey);
    }
    if (!availableTemplates.value.find(template => template.id === selectedTemplateId.value)) {
      selectedTemplateId.value = availableTemplates.value[0]?.id || null;
    }
    return availableTemplates.value;
  }

  function setPlatform(platformKey) {
    selectedPlatform.value = platformKey || 'dewu';
    selectedTemplateId.value = null;
    copyPromptDraft.value = null;
    imagePromptDraft.value = null;
  }

  function setTemplate(templateId) {
    selectedTemplateId.value = templateId || null;
    copyPromptDraft.value = null;
    imagePromptDraft.value = null;
  }

  function updateTemplateVariable(key, value) {
    templateVariables.value = {
      ...templateVariables.value,
      [key]: value,
    };
  }

  async function uploadImage(file) {
    processing.value = true;
    error.value = null;
    try {
      const keepPlatform = selectedPlatform.value;
      const keepTemplateId = selectedTemplateId.value;
      const keepVariables = { ...templateVariables.value };
      reset();
      selectedPlatform.value = keepPlatform;
      selectedTemplateId.value = keepTemplateId;
      templateVariables.value = keepVariables;

      const formData = new FormData();
      formData.append('image', file);
      const data = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      uploadedImage.value = data;
      currentStep.value = 1;
      return data;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      processing.value = false;
    }
  }

  async function recognizeProduct() {
    if (!uploadedImage.value) throw new Error('请先上传图片');
    processing.value = true;
    error.value = null;
    currentStep.value = 1;
    recognition.value = { brand: '', productName: '', category: '', description: '', confidence: '', streaming: true };

    try {
      let rawText = '';
      await consumeSSE('/recognize/stream', { imageUrl: uploadedImage.value.imageUrl }, chunk => {
        rawText = chunk.fullText;
      });
      const final = tryParseRecognition(rawText);
      recognition.value = { ...final, streaming: false, rawResponse: rawText };
      recognitionConfirmed.value = false;
      return recognition.value;
    } catch (e) {
      error.value = e.message;
      recognition.value = null;
      throw e;
    } finally {
      processing.value = false;
    }
  }

  function tryParseRecognition(text) {
    const parsed = parseJSON(text);
    return parsed ? {
      brand: parsed.brand || '',
      productName: parsed.productName || '',
      category: parsed.category || '',
      description: parsed.description || '',
      confidence: parsed.confidence || '',
    } : { brand: '', productName: '', category: '', description: '', confidence: '' };
  }

  async function previewCopyPrompt(promptOverride = '') {
    if (!recognition.value) throw new Error('请先完成商品识别');
    const data = await api.post('/copy/preview-prompt', {
      brand: recognition.value.brand,
      productName: recognition.value.productName,
      category: recognition.value.category,
      description: recognition.value.description,
      platformKey: selectedPlatform.value,
      templateId: selectedTemplateId.value,
      variables: templateVariables.value,
      promptOverride,
    });
    copyPromptDraft.value = data;
    return data;
  }

  async function generateCopy({ promptOverride = '', style = '' } = {}) {
    if (!recognition.value) throw new Error('请先完成商品识别');
    processing.value = true;
    error.value = null;
    currentStep.value = 2;
    copy.value = { title: '', content: '', tags: [], hashtags: [], streaming: true };

    try {
      const preview = copyPromptDraft.value || await previewCopyPrompt(promptOverride);
      let rawText = '';
      await consumeSSE('/copy/generate/stream', {
        brand: recognition.value.brand,
        productName: recognition.value.productName,
        category: recognition.value.category,
        description: recognition.value.description,
        style,
        platformKey: selectedPlatform.value,
        templateId: selectedTemplateId.value,
        variables: templateVariables.value,
        promptOverride: promptOverride || preview.userPrompt,
      }, chunk => {
        if (chunk.done) return;
        rawText = chunk.fullText;
      });

      const final = tryParseCopy(rawText, selectedPlatform.value);
      copy.value = { ...final, platformKey: selectedPlatform.value, streaming: false };
      copyPromptDraft.value = preview;
      currentStep.value = 3;
      return copy.value;
    } catch (e) {
      error.value = e.message;
      copy.value = null;
      throw e;
    } finally {
      processing.value = false;
    }
  }

  function tryParseCopy(text, platformKey = 'dewu') {
    const parsed = parseJSON(text);
    if (parsed) return parsed;
    if (platformKey === 'douyin') {
      return {
        scriptTitle: '抖音脚本草稿',
        hook: '',
        voiceover: text,
        scenes: [],
        caption: text,
        hashtags: [],
      };
    }
    if (platformKey === 'wechat_oa') {
      return {
        articleTitle: '公众号文章草稿',
        summary: '',
        outline: [],
        body: text,
        cta: '',
        keywords: [],
      };
    }
    return {
      title: '',
      content: text,
      tags: [],
      hashtags: [],
      coverText: '',
    };
  }

  async function previewImagePrompt(promptOverride = '') {
    if (!recognition.value || !copy.value) throw new Error('请先完成商品识别和文案生成');
    const data = await api.post('/image/preview-prompt', {
      brand: recognition.value.brand,
      productName: recognition.value.productName,
      category: recognition.value.category,
      description: recognition.value.description,
      copyResult: compactCopy(copy.value),
      platformKey: selectedPlatform.value,
      templateId: selectedTemplateId.value,
      variables: templateVariables.value,
      promptOverride,
    });
    imagePromptDraft.value = data;
    return data;
  }

  async function generateImage({ promptOverride = '', size = '2048x2048' } = {}) {
    if (!uploadedImage.value) throw new Error('请先上传图片');
    if (!recognition.value || !copy.value) throw new Error('请先完成商品识别和文案生成');
    processing.value = true;
    error.value = null;
    currentStep.value = 3;
    try {
      const preview = imagePromptDraft.value || await previewImagePrompt(promptOverride);
      const data = await api.post('/image/edit', {
        imageUrl: uploadedImage.value.imageUrl,
        prompt: promptOverride || preview.userPrompt,
        size,
        platformKey: selectedPlatform.value,
        templateId: selectedTemplateId.value,
      });
      imagePromptDraft.value = preview;
      imageJob.value = { jobId: data.jobId, status: data.status, statusUrl: data.statusUrl };
      taskId.value = data.task?.id || null;
      taskStatus.value = data.task?.status || data.status || '';
      upsertLocalHistory({
        status: 'pending_image',
        job_id: data.jobId,
        task_id: taskId.value,
        prompt_snapshot_json: { copyPrompt: copyPromptDraft.value, imagePrompt: preview },
        generated_images: [],
      });
      return data;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      processing.value = false;
    }
  }

  async function pollImageStatus() {
    if (!imageJob.value) throw new Error('没有进行中的图片生成任务');
    try {
      const data = await api.get(`/image/status/${imageJob.value.jobId}`);
      if (data.status === 'done') {
        generatedImages.value = (data.resultUrls || []).map(url => ({ url }));
        currentStep.value = 4;
        processing.value = false;
        taskStatus.value = 'completed';
        if (historyId.value) {
          updateLocalHistoryRecord(getLocalHistoryUserId(), historyId.value, {
            status: 'completed',
            generated_images: data.resultUrls || [],
            task_id: taskId.value,
            job_id: imageJob.value?.jobId,
            result_snapshot_json: { completedAt: new Date().toISOString() },
          });
        }
        return data;
      }
      if (data.status === 'failed') {
        processing.value = false;
        taskStatus.value = 'failed';
        if (historyId.value) {
          updateLocalHistoryRecord(getLocalHistoryUserId(), historyId.value, {
            status: 'failed',
            task_id: taskId.value,
            job_id: imageJob.value?.jobId,
          });
        }
        throw new Error(`图片生成失败: ${data.errorMessage}`);
      }
      taskStatus.value = data.status;
      return data;
    } catch (e) {
      if (e.message.includes('失败')) {
        error.value = e.message;
        processing.value = false;
      }
      throw e;
    }
  }

  async function runFullPipeline({ copyStyle = '', imageSize = '2048x2048', recognitionOverride = null } = {}) {
    if (!uploadedImage.value) throw new Error('请先上传图片');
    processing.value = true;
    error.value = null;

    try {
      const data = await api.post('/workflow/run', {
        imageUrl: uploadedImage.value.imageUrl,
        copyStyle,
        imageSize,
        platformKey: selectedPlatform.value,
        templateId: selectedTemplateId.value,
        variables: templateVariables.value,
        recognitionOverride: recognitionOverride || compactRecognition(recognition.value),
      });

      recognition.value = data.recognition;
      copy.value = { ...data.copy, platformKey: selectedPlatform.value };
      imageJob.value = data.imageJob;
      taskId.value = data.task?.id || data.taskId || null;
      taskStatus.value = data.task?.status || data.imageJob?.status || '';
      currentStep.value = 3;

      const localRecord = createLocalHistoryRecord(getLocalHistoryUserId(), {
        original_image: uploadedImage.value.imageUrl,
        recognition_result: compactRecognition(data.recognition),
        copy_result: compactCopy(data.copy),
        generated_images: [],
        status: 'pending_image',
        job_id: data.imageJob?.jobId || null,
        task_id: taskId.value,
        platform_key: selectedPlatform.value,
        template_id: selectedTemplateId.value,
        workflow_mode: 'one_click',
        prompt_snapshot_json: {
          copyPromptHidden: true,
          imagePromptHidden: true,
        },
      });
      historyId.value = localRecord.id;

      return data;
    } catch (e) {
      error.value = e.message;
      processing.value = false;
      throw e;
    }
  }

  async function runManualWorkflow({ copyPromptOverride = '', imagePromptOverride = '', imageSize = '2048x2048', recognitionOverride = null } = {}) {
    if (!uploadedImage.value) throw new Error('请先上传图片');
    processing.value = true;
    error.value = null;

    try {
      const data = await api.post('/workflow/run-manual', {
        imageUrl: uploadedImage.value.imageUrl,
        platformKey: selectedPlatform.value,
        templateId: selectedTemplateId.value,
        variables: templateVariables.value,
        copyPromptOverride,
        imagePromptOverride,
        imageSize,
        recognitionOverride: recognitionOverride || compactRecognition(recognition.value),
      });

      recognition.value = data.recognition;
      copy.value = { ...data.copy, platformKey: selectedPlatform.value };
      imageJob.value = data.imageJob;
      taskId.value = data.task?.id || null;
      taskStatus.value = data.task?.status || data.imageJob?.status || '';
      copyPromptDraft.value = data.prompt?.copyPrompt || null;
      imagePromptDraft.value = data.prompt?.imagePrompt || null;
      currentStep.value = 3;

      const localRecord = createLocalHistoryRecord(getLocalHistoryUserId(), {
        original_image: uploadedImage.value.imageUrl,
        recognition_result: compactRecognition(data.recognition),
        copy_result: compactCopy(data.copy),
        generated_images: [],
        status: 'pending_image',
        job_id: data.imageJob?.jobId || null,
        task_id: taskId.value,
        platform_key: selectedPlatform.value,
        template_id: selectedTemplateId.value,
        workflow_mode: 'manual',
        prompt_snapshot_json: data.prompt || { copyPrompt: copyPromptDraft.value, imagePrompt: imagePromptDraft.value },
      });
      historyId.value = localRecord.id;

      return data;
    } catch (e) {
      error.value = e.message;
      processing.value = false;
      throw e;
    }
  }

  async function loadTask(id = taskId.value) {
    if (!id) return null;
    const data = await api.get(`/tasks/${id}`);
    taskStatus.value = data.status;
    return data;
  }

  async function pollTask(id = taskId.value) {
    if (!id) return null;
    const data = await loadTask(id);
    if (data?.status) taskStatus.value = data.status;
    return data;
  }

  function confirmRecognition(nextRecognition) {
    recognition.value = {
      ...nextRecognition,
      rawResponse: recognition.value?.rawResponse || '',
      streaming: false,
    };
    recognitionConfirmed.value = true;
    currentStep.value = 2;
    return recognition.value;
  }

  return {
    uploadedImage,
    recognition,
    copy,
    imageJob,
    generatedImages,
    historyId,
    taskId,
    taskStatus,
    selectedPlatform,
    selectedTemplateId,
    templateVariables,
    availablePlatforms,
    availableTemplates,
    copyPromptDraft,
    imagePromptDraft,
    currentStep,
    error,
    processing,
    recognitionConfirmed,
    reset,
    loadPlatforms,
    loadTemplates,
    setPlatform,
    setTemplate,
    updateTemplateVariable,
    uploadImage,
    recognizeProduct,
    confirmRecognition,
    previewCopyPrompt,
    generateCopy,
    previewImagePrompt,
    generateImage,
    pollImageStatus,
    runFullPipeline,
    runManualWorkflow,
    loadTask,
    pollTask,
  };
});
