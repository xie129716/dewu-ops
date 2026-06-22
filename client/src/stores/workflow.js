import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api';
import { consumeSSE } from '@/utils/sse';
import { parseJSON } from '@/utils/parse';

const DEFAULT_VARIABLES = {
  audience: '',
  tone: '',
  sellingPoints: '',
  cta: '',
  scene: '',
};

export const useWorkflowStore = defineStore('workflow', () => {
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
  }

  async function loadPlatforms() {
    const data = await api.get('/platforms');
    availablePlatforms.value = data.list || [];
    if (!availablePlatforms.value.find(platform => platform.key === selectedPlatform.value) && availablePlatforms.value.length) {
      selectedPlatform.value = availablePlatforms.value[0].key;
    }
    return availablePlatforms.value;
  }

  async function loadTemplates(platformKey = selectedPlatform.value) {
    const data = await api.get('/templates', { params: { platformKey } });
    availableTemplates.value = data.list || [];
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
      currentStep.value = 2;
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
      copyResult: copy.value,
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
        historyId: historyId.value,
        platformKey: selectedPlatform.value,
        templateId: selectedTemplateId.value,
      });
      imagePromptDraft.value = preview;
      imageJob.value = { jobId: data.jobId, status: data.status, statusUrl: data.statusUrl };
      taskId.value = data.task?.id || null;
      taskStatus.value = data.task?.status || data.status || '';
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
          await api.patch(`/history/${historyId.value}`, {
            status: 'completed',
            generated_images: data.resultUrls,
            job_id: imageJob.value?.jobId,
            task_id: taskId.value,
          });
        }
        return data;
      }
      if (data.status === 'failed') {
        processing.value = false;
        taskStatus.value = 'failed';
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

  async function runFullPipeline({ copyStyle = '', imageSize = '2048x2048' } = {}) {
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
      });

      recognition.value = data.recognition;
      copy.value = { ...data.copy, platformKey: selectedPlatform.value };
      imageJob.value = data.imageJob;
      historyId.value = data.historyId;
      taskId.value = data.task?.id || data.taskId || null;
      taskStatus.value = data.task?.status || data.imageJob?.status || '';
      currentStep.value = 3;

      return data;
    } catch (e) {
      error.value = e.message;
      processing.value = false;
      throw e;
    }
  }

  async function runManualWorkflow({ copyPromptOverride = '', imagePromptOverride = '', imageSize = '2048x2048' } = {}) {
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
      });

      recognition.value = data.recognition;
      copy.value = { ...data.copy, platformKey: selectedPlatform.value };
      imageJob.value = data.imageJob;
      historyId.value = data.historyId;
      taskId.value = data.task?.id || null;
      taskStatus.value = data.task?.status || data.imageJob?.status || '';
      copyPromptDraft.value = data.prompt?.copyPrompt || null;
      imagePromptDraft.value = data.prompt?.imagePrompt || null;
      currentStep.value = 3;
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
    reset,
    loadPlatforms,
    loadTemplates,
    setPlatform,
    setTemplate,
    updateTemplateVariable,
    uploadImage,
    recognizeProduct,
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
