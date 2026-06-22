const { getTemplateById, listTemplates } = require('./storage');
const { normalizePlatformKey } = require('./platforms');

function getDefaultTemplateCode(platformKey) {
  const map = {
    dewu: 'dewu-seeding',
    douyin: 'douyin-script',
    xiaohongshu: 'xiaohongshu-note',
    wechat_oa: 'wechat-article',
  };
  return map[normalizePlatformKey(platformKey)] || 'dewu-seeding';
}

function getResolvedTemplate({ templateId, platformKey = 'dewu' } = {}) {
  const normalizedPlatformKey = normalizePlatformKey(platformKey);
  if (templateId) {
    const template = getTemplateById(templateId);
    if (template) return template;
  }
  const defaultCode = getDefaultTemplateCode(normalizedPlatformKey);
  return listTemplates({ platformKey: normalizedPlatformKey, enabledOnly: true }).find(template => template.code === defaultCode)
    || listTemplates({ platformKey: normalizedPlatformKey, enabledOnly: true })[0]
    || null;
}

function resolveTemplateVariables(template, variables = {}) {
  const resolved = {};
  const schema = template?.variable_schema || [];
  schema.forEach(field => {
    resolved[field.key] = variables[field.key] ?? field.default ?? '';
  });
  return { ...resolved, ...variables };
}

function fillTemplateString(templateString = '', values = {}) {
  return String(templateString).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

module.exports = {
  getResolvedTemplate,
  resolveTemplateVariables,
  fillTemplateString,
};
