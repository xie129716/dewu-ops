const { getPlatformDefinition, normalizePlatformKey, getOutputSchema } = require('./platforms');
const { getResolvedTemplate, resolveTemplateVariables, fillTemplateString } = require('./templates');

function buildPromptContext({ productInfo = {}, copyResult = {}, variables = {}, platformKey = 'dewu' } = {}) {
  const normalizedPlatformKey = normalizePlatformKey(platformKey);
  return {
    platformKey: normalizedPlatformKey,
    brand: productInfo.brand || '',
    productName: productInfo.productName || '',
    category: productInfo.category || '',
    description: productInfo.description || '',
    copyTitle: copyResult.title || copyResult.scriptTitle || copyResult.articleTitle || '',
    copyContent: copyResult.content || copyResult.voiceover || copyResult.body || '',
    hashtags: Array.isArray(copyResult.hashtags) ? copyResult.hashtags.join('、') : '',
    ...variables,
  };
}

function buildCopyPromptPreview({ productInfo, platformKey = 'dewu', templateId, variables = {}, promptOverride = '' } = {}) {
  const normalizedPlatformKey = normalizePlatformKey(platformKey);
  const platform = getPlatformDefinition(normalizedPlatformKey);
  const template = getResolvedTemplate({ templateId, platformKey: normalizedPlatformKey });
  const resolvedVariables = resolveTemplateVariables(template, variables);
  const context = buildPromptContext({ productInfo, variables: resolvedVariables, platformKey: normalizedPlatformKey });
  const userPrompt = promptOverride
    || fillTemplateString(template?.content_prompt_template || '', context)
    || `请围绕 ${context.brand} ${context.productName}（${context.category}）为 ${platform.name} 生成内容。`;

  return {
    platformKey: normalizedPlatformKey,
    platformName: platform.name,
    templateId: template?.id || null,
    templateCode: template?.code || null,
    templateName: template?.name || null,
    systemPrompt: `${platform.systemPrompt}\n输出结构参考：${JSON.stringify(getOutputSchema(normalizedPlatformKey), null, 2)}`,
    userPrompt: `${userPrompt}\n\n商品信息：品牌=${context.brand}；商品名=${context.productName}；品类=${context.category}${context.description ? `；描述=${context.description}` : ''}`,
    variables: resolvedVariables,
    outputSchema: getOutputSchema(normalizedPlatformKey),
  };
}

function buildImagePromptPreview({ productInfo, copyResult = {}, platformKey = 'dewu', templateId, variables = {}, promptOverride = '' } = {}) {
  const normalizedPlatformKey = normalizePlatformKey(platformKey);
  const platform = getPlatformDefinition(normalizedPlatformKey);
  const template = getResolvedTemplate({ templateId, platformKey: normalizedPlatformKey });
  const resolvedVariables = resolveTemplateVariables(template, variables);
  const context = buildPromptContext({ productInfo, copyResult, variables: resolvedVariables, platformKey: normalizedPlatformKey });
  const basePrompt = promptOverride
    || fillTemplateString(template?.image_prompt_template || '', context)
    || `保持 ${context.brand} ${context.productName} 主体完全不变，输出适合 ${platform.name} 内容场景的高质量商品图。`;

  const userPrompt = [
    `参考图中是一个${context.brand} ${context.productName}（${context.category}）。`,
    '保持商品主体的颜色、材质、纹理、logo、轮廓、缝线等所有外观细节完全不变。',
    `目标平台：${platform.name}。`,
    context.audience ? `目标人群：${context.audience}。` : '',
    context.tone ? `内容语气：${context.tone}。` : '',
    context.scene ? `使用场景：${context.scene}。` : '',
    context.sellingPoints ? `核心卖点：${context.sellingPoints}。` : '',
    context.cta ? `行动号召：${context.cta}。` : '',
    basePrompt,
    context.copyTitle ? `文案标题参考：${context.copyTitle}` : '',
    context.copyContent ? `文案内容参考：${context.copyContent}` : '',
  ].filter(Boolean).join(' ');

  return {
    platformKey: normalizedPlatformKey,
    platformName: platform.name,
    templateId: template?.id || null,
    templateCode: template?.code || null,
    templateName: template?.name || null,
    systemPrompt: '你是高端电商与内容营销商品图提示词策划专家，负责生成适合目标平台传播的商品图指令。',
    userPrompt,
    variables: resolvedVariables,
  };
}

module.exports = {
  buildCopyPromptPreview,
  buildImagePromptPreview,
};
