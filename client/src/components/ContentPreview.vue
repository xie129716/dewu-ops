<template>
  <component :is="previewComponent" v-bind="previewProps" @download="handleDownload" />
</template>

<script setup>
import { computed } from 'vue';
import DewuPostPreview from '@/components/DewuPostPreview.vue';
import DouyinPreview from '@/components/previews/DouyinPreview.vue';
import XiaohongshuPreview from '@/components/previews/XiaohongshuPreview.vue';
import WechatOAPreview from '@/components/previews/WechatOAPreview.vue';

const props = defineProps({
  platformKey: { type: String, default: 'dewu' },
  copyData: { type: Object, default: () => ({}) },
  recognitionData: { type: Object, default: () => ({}) },
  generatedImages: { type: Array, default: () => [] },
});

const emit = defineEmits(['download']);

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
</script>
