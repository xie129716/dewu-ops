import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/api';
import { consumeSSE } from '@/utils/sse';
import { parseJSON } from '@/utils/parse';

function pickBackground() {
  const backgrounds = [
    '一条干净的柏油马路路面，远处有模糊的街景',
    '一片翠绿的草地，有自然的光斑洒落',
    '一个安静的公园小径，周围有绿植和树木虚化',
    '纯色干净的电商摄影棚白色背景，专业产品摄影打光',
    '阳光明媚的沙滩，远处有海浪和天空',
  ];
  return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

export const useWorkflowStore = defineStore('workflow', () => {
  const uploadedImage = ref(null);       // { imageUrl, filename, originalName }
  const recognition = ref(null);         // { brand, productName, category, ... }
  const copy = ref(null);               // { title, content, tags, hashtags }
  const imageJob = ref(null);           // { jobId, status, statusUrl }
  const generatedImages = ref([]);      // [{ url }]
  const historyId = ref(null);

  const currentStep = ref(0);           // 0=idle, 1=recognizing, 2=generating copy, 3=generating image, 4=complete
  const error = ref(null);
  const processing = ref(false);

  function reset() {
    uploadedImage.value = null;
    recognition.value = null;
    copy.value = null;
    imageJob.value = null;
    generatedImages.value = [];
    historyId.value = null;
    currentStep.value = 0;
    error.value = null;
    processing.value = false;
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
    // Init streaming state
    recognition.value = { brand: '', productName: '', category: '', description: '', confidence: '', streaming: true };

    try {
      let rawText = '';
      await consumeSSE('/recognize/stream', { imageUrl: uploadedImage.value.imageUrl }, (chunk) => {
        rawText = chunk.fullText;
        // Try partial parse for live update
        const parsed = tryParseRecognition(rawText);
        recognition.value = { ...parsed, streaming: true, rawResponse: rawText };
      });

      // Final parse
      const final = tryParseRecognition(rawText);
      recognition.value = { ...final, streaming: false, rawResponse: rawText };
      currentStep.value = 2;
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

  async function generateCopy(style) {
    if (!recognition.value) throw new Error('请先完成商品识别');
    processing.value = true;
    error.value = null;
    currentStep.value = 2;
    copy.value = { title: '', content: '', tags: [], hashtags: [], streaming: true };

    try {
      let rawText = '';
      await consumeSSE('/copy/generate/stream', {
        brand: recognition.value.brand,
        productName: recognition.value.productName,
        category: recognition.value.category,
        style,
      }, (chunk) => {
        if (chunk.done) return;
        rawText = chunk.fullText;
        const parsed = tryParseCopy(rawText);
        copy.value = { ...parsed, streaming: true };
      });

      const final = tryParseCopy(rawText);
      copy.value = { ...final, streaming: false };
      currentStep.value = 3;
    } catch (e) {
      error.value = e.message;
      copy.value = null;
      throw e;
    } finally {
      processing.value = false;
    }
  }

  function tryParseCopy(text) {
    const parsed = parseJSON(text);
    return parsed ? {
      title: parsed.title || '',
      content: parsed.content || '',
      tags: parsed.tags || [],
      hashtags: parsed.hashtags || [],
    } : { title: '', content: text, tags: [], hashtags: [] };
  }

  async function generateImage(size) {
    if (!uploadedImage.value) throw new Error('请先上传图片');
    if (!recognition.value || !copy.value) throw new Error('请先完成商品识别和文案生成');
    processing.value = true;
    error.value = null;
    currentStep.value = 3;
    try {
      const bg = pickBackground();
      const prompt = `参考图中是一个${recognition.value.brand} ${recognition.value.productName}（${recognition.value.category}）。保持图中商品主体的所有外观细节完全不变（包括颜色、材质纹理、logo、鞋型/包型轮廓、缝线等一切细节），仅将背景替换为${bg}。自然阳光从上方照射在商品上，呈现真实的光影效果和立体感。高清质感，画面干净高级，适合电商种草推广，得物App社区风格。`;
      const data = await api.post('/image/edit', {
        imageUrl: uploadedImage.value.imageUrl,
        prompt,
        size: size || '2048x2048',
      });
      imageJob.value = data;
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
        generatedImages.value = data.resultUrls.map(url => ({ url }));
        currentStep.value = 4;
        processing.value = false;
        // Update history
        if (historyId.value) {
          await api.patch(`/history/${historyId.value}`, {
            status: 'completed',
            generatedImages: data.resultUrls,
            jobId: imageJob.value?.jobId,
          });
        }
        return data;
      } else if (data.status === 'failed') {
        processing.value = false;
        throw new Error(`图片生成失败: ${data.errorMessage}`);
      }
      return data;
    } catch (e) {
      if (e.message.includes('失败')) {
        error.value = e.message;
        processing.value = false;
      }
      throw e;
    }
  }

  async function runFullPipeline({ copyStyle, imageSize } = {}) {
    if (!uploadedImage.value) throw new Error('请先上传图片');
    processing.value = true;
    error.value = null;

    try {
      const data = await api.post('/workflow/run', {
        imageUrl: uploadedImage.value.imageUrl,
        copyStyle,
        imageSize,
      });

      recognition.value = data.recognition;
      copy.value = data.copy;
      imageJob.value = data.imageJob;
      historyId.value = data.historyId;
      currentStep.value = 3;

      return data;
    } catch (e) {
      error.value = e.message;
      processing.value = false;
      throw e;
    }
  }

  return {
    uploadedImage,
    recognition,
    copy,
    imageJob,
    generatedImages,
    historyId,
    currentStep,
    error,
    processing,
    reset,
    uploadImage,
    recognizeProduct,
    generateCopy,
    generateImage,
    pollImageStatus,
    runFullPipeline,
  };
});
