const PLATFORM_DEFINITIONS = {
  dewu: {
    key: 'dewu',
    name: '得物',
    category: 'community_post',
    outputSchema: {
      title: '帖子标题（15字以内）',
      content: '正文内容（200-400字）',
      tags: ['标签1', '标签2'],
      hashtags: ['#话题1', '#话题2'],
    },
    systemPrompt: `你是一个得物（Dewu）App 社区的顶级潮流博主，擅长撰写吸引人的商品种草文案。
输出必须是合法 JSON，不要输出 Markdown 代码块，不要输出额外解释。
JSON 字段固定为：title、content、tags、hashtags。`,
    fallback(productInfo = {}) {
      return {
        title: `${productInfo.brand || ''} ${productInfo.productName || ''}`.trim() || '潮流单品推荐',
        content: '这是一篇围绕商品卖点、上身场景和真实推荐感展开的得物风格内容。',
        tags: [productInfo.brand, productInfo.category].filter(Boolean),
        hashtags: [productInfo.brand && `#${productInfo.brand}`, productInfo.category && `#${productInfo.category}`, '#得物种草'].filter(Boolean),
      };
    },
  },
  douyin: {
    key: 'douyin',
    name: '抖音',
    category: 'short_video',
    outputSchema: {
      scriptTitle: '脚本标题',
      hook: '开场3秒钩子',
      voiceover: '核心口播文案',
      scenes: ['分镜1', '分镜2'],
      caption: '视频文案',
      hashtags: ['#话题1', '#话题2'],
    },
    systemPrompt: `你是抖音电商短视频带货脚本策划专家。
输出必须是合法 JSON，不要输出 Markdown 代码块，不要输出额外解释。
JSON 字段固定为：scriptTitle、hook、voiceover、scenes、caption、hashtags。`,
    fallback(productInfo = {}) {
      return {
        scriptTitle: `${productInfo.brand || ''}${productInfo.productName || ''}带货脚本`,
        hook: '这个单品为什么最近被反复提起？',
        voiceover: '围绕商品核心卖点、使用场景和购买理由展开口播。',
        scenes: ['商品特写', '上手/上身展示', '卖点拆解', '结尾 CTA'],
        caption: `${productInfo.brand || ''} ${productInfo.productName || ''}`.trim(),
        hashtags: [productInfo.brand && `#${productInfo.brand}`, '#抖音带货', '#好物推荐'].filter(Boolean),
      };
    },
  },
  xiaohongshu: {
    key: 'xiaohongshu',
    name: '小红书',
    category: 'social_note',
    outputSchema: {
      title: '笔记标题',
      content: '笔记正文',
      tags: ['标签1', '标签2'],
      hashtags: ['#话题1', '#话题2'],
      coverText: '封面文案',
    },
    systemPrompt: `你是小红书图文种草内容策划专家。
输出必须是合法 JSON，不要输出 Markdown 代码块，不要输出额外解释。
JSON 字段固定为：title、content、tags、hashtags、coverText。`,
    fallback(productInfo = {}) {
      return {
        title: `${productInfo.brand || ''} ${productInfo.productName || ''}`.trim() || '好物种草',
        content: '围绕使用体验、外观审美和场景价值生成真实分享感强的小红书笔记。',
        tags: [productInfo.brand, productInfo.category].filter(Boolean),
        hashtags: [productInfo.brand && `#${productInfo.brand}`, '#小红书种草', '#购物分享'].filter(Boolean),
        coverText: '近期爱用好物',
      };
    },
  },
  wechat_oa: {
    key: 'wechat_oa',
    name: '微信公众号',
    category: 'article',
    outputSchema: {
      articleTitle: '文章标题',
      summary: '摘要',
      outline: ['提纲1', '提纲2'],
      body: '正文',
      cta: '行动号召',
      keywords: ['关键词1', '关键词2'],
    },
    systemPrompt: `你是微信公众号商品导购文章策划专家。
输出必须是合法 JSON，不要输出 Markdown 代码块，不要输出额外解释。
JSON 字段固定为：articleTitle、summary、outline、body、cta、keywords。`,
    fallback(productInfo = {}) {
      return {
        articleTitle: `${productInfo.brand || ''} ${productInfo.productName || ''}`.trim() || '商品导购文章',
        summary: '用简洁摘要交代商品定位、核心卖点与适合人群。',
        outline: ['商品是什么', '为什么值得关注', '适合哪些场景', '购买建议'],
        body: '围绕商品认知、卖点、场景和决策建议展开完整公众号文章。',
        cta: '如需了解更多细节，可进一步咨询或查看详情。',
        keywords: [productInfo.brand, productInfo.productName, productInfo.category].filter(Boolean),
      };
    },
  },
};

function normalizePlatformKey(platformKey = 'dewu') {
  return PLATFORM_DEFINITIONS[platformKey] ? platformKey : 'dewu';
}

function getPlatformDefinition(platformKey = 'dewu') {
  return PLATFORM_DEFINITIONS[normalizePlatformKey(platformKey)];
}

function listPlatformDefinitions() {
  return Object.values(PLATFORM_DEFINITIONS);
}

function getOutputSchema(platformKey = 'dewu') {
  return getPlatformDefinition(platformKey).outputSchema;
}

function getFallbackOutput(platformKey = 'dewu', productInfo = {}) {
  return getPlatformDefinition(platformKey).fallback(productInfo);
}

module.exports = {
  normalizePlatformKey,
  getPlatformDefinition,
  listPlatformDefinitions,
  getOutputSchema,
  getFallbackOutput,
};
