const PLATFORM_FALLBACKS = [
  { key: 'dewu', name: '得物', category: 'community_post', enabled: true },
  { key: 'douyin', name: '抖音', category: 'short_video', enabled: true },
  { key: 'xiaohongshu', name: '小红书', category: 'social_note', enabled: true },
  { key: 'wechat_oa', name: '微信公众号', category: 'article', enabled: true },
];

const TEMPLATE_FALLBACKS = {
  dewu: [
    { id: 'fallback-dewu-seeding', code: 'dewu-seeding', name: '得物社区种草', scene_type: 'community_post', target_platforms: ['dewu'], template_type: 'system', enabled: true },
  ],
  douyin: [
    { id: 'fallback-douyin-script', code: 'douyin-script', name: '抖音带货短视频脚本', scene_type: 'short_video_script', target_platforms: ['douyin'], template_type: 'system', enabled: true },
  ],
  xiaohongshu: [
    { id: 'fallback-xiaohongshu-note', code: 'xiaohongshu-note', name: '小红书图文种草', scene_type: 'social_note', target_platforms: ['xiaohongshu'], template_type: 'system', enabled: true },
  ],
  wechat_oa: [
    { id: 'fallback-wechat-article', code: 'wechat-article', name: '公众号商品文章', scene_type: 'article', target_platforms: ['wechat_oa'], template_type: 'system', enabled: true },
  ],
};

function getPlatformFallbacks() {
  return PLATFORM_FALLBACKS.map(item => ({ ...item }));
}

function getTemplateFallbacks(platformKey = 'dewu') {
  return (TEMPLATE_FALLBACKS[platformKey] || []).map(item => ({ ...item }));
}

export {
  getPlatformFallbacks,
  getTemplateFallbacks,
};
