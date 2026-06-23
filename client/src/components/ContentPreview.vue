<template>
  <div ref="previewWrapper" class="content-preview-shell">
    <div class="preview-toolbar">
      <button class="btn btn-primary btn-sm" @click="handlePngDownload">🖼️ 导出预览 PNG</button>
    </div>
    <component :is="previewComponent" v-bind="previewProps" @download="handleDownload" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import DewuPostPreview from '@/components/DewuPostPreview.vue';
import DouyinPreview from '@/components/previews/DouyinPreview.vue';
import XiaohongshuPreview from '@/components/previews/XiaohongshuPreview.vue';
import WechatOAPreview from '@/components/previews/WechatOAPreview.vue';
import { downloadElementAsPng } from '@/utils/download';

const props = defineProps({
  platformKey: { type: String, default: 'dewu' },
  copyData: { type: Object, default: () => ({}) },
  recognitionData: { type: Object, default: () => ({}) },
  generatedImages: { type: Array, default: () => [] },
});

const emit = defineEmits(['download']);
const previewWrapper = ref(null);

const previewComponent = computed(() => {
  switch (props.platformKey) {
    case 'douyin': return DouyinPreview;
    case 'xiaohongshu': return XiaohongshuPreview;
    case 'wechat_oa': return WechatOAPreview;
    default: return DewuPostPreview;
  }
});

const previewProps = computed(() => {
  if (props.platformKey === 'dewu') {
    return {
      generatedImages: props.generatedImages,
      brand: props.recognitionData?.brand,
      productName: props.recognitionData?.productName,
      category: props.recognitionData?.category,
      title: props.copyData?.title,
      content: props.copyData?.content,
      tags: props.copyData?.tags || [],
      hashtags: props.copyData?.hashtags || [],
    };
  }
  return {
    data: props.copyData || {},
    generatedImages: props.generatedImages || [],
    recognitionData: props.recognitionData || {},
  };
});

function handleDownload(...args) {
  const [url, filename] = args;
  emit('download', url, filename);
}

async function handlePngDownload() {
  if (!previewWrapper.value) return;
  const filename = `${props.platformKey || 'preview'}-preview.png`;
  await downloadElementAsPng(previewWrapper.value, filename);
}
</script>

<style scoped>
.content-preview-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-toolbar {
  display: flex;
  justify-content: flex-end;
}
</style>
