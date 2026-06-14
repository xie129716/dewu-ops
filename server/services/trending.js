const { execSync } = require('child_process');

/**
 * Run an opencli command and parse the YAML output.
 * Uses the opencli daemon for fast execution.
 */
function opencli(args, timeout = 30000) {
  const cmd = `opencli ${args}`;
  console.log(`[Trending] Running: ${cmd}`);
  const stdout = execSync(cmd, { timeout, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  return stdout;
}

/**
 * Parse opencli's YAML-like list output into an array of objects.
 */
function parseList(output) {
  const items = [];
  let current = null;
  for (const line of output.split('\n')) {
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (indent <= 2 && trimmed.startsWith('- ')) {
      if (current) items.push(current);
      current = {};
    } else if (current && indent >= 2 && trimmed.includes(': ')) {
      const idx = trimmed.indexOf(': ');
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 2).trim();
      current[key] = value;
    }
  }
  if (current) items.push(current);
  return items;
}

/**
 * Search 1688 for trending products by keyword.
 */
function search1688(keyword) {
  try {
    const out = opencli(`1688 search --keyword "${keyword}"`, 20000);
    return parseList(out);
  } catch (e) {
    console.error('[Trending] 1688 search failed:', e.message);
    return [];
  }
}

/**
 * Search taobao for products by keyword.
 */
function searchTaobao(keyword) {
  try {
    const out = opencli(`taobao search --keyword "${keyword}"`, 20000);
    return parseList(out);
  } catch (e) {
    console.error('[Trending] Taobao search failed:', e.message);
    return [];
  }
}

/**
 * Get Bilibili ranking (trending content).
 */
function bilibiliRanking() {
  try {
    const out = opencli('bilibili ranking', 15000);
    return parseList(out);
  } catch (e) {
    console.error('[Trending] Bilibili ranking failed:', e.message);
    return [];
  }
}

/**
 * Run a comprehensive trending analysis for a given category.
 */
async function analyzeTrends(category) {
  const keywords = getKeywordsForCategory(category);
  const results = { category, platforms: {}, timestamp: new Date().toISOString() };

  // 1688 wholesale trends
  try {
    const items = search1688(keywords.primary);
    results.platforms['1688'] = items.slice(0, 20).map(i => ({
      title: i.title || i.name || '',
      price: i.price || '',
      sales: i.sales || i.sold || '',
      url: i.url || i.link || '',
      shop: i.shop || i.store || '',
    }));
  } catch (e) { results.platforms['1688'] = []; }

  // Taobao retail trends
  try {
    const items = searchTaobao(keywords.primary);
    results.platforms['taobao'] = items.slice(0, 20).map(i => ({
      title: i.title || i.name || '',
      price: i.price || '',
      sales: i.sales || i.sold || '',
      url: i.url || i.link || '',
      shop: i.shop || i.store || '',
    }));
  } catch (e) { results.platforms['taobao'] = []; }

  // Bilibili content trends
  try {
    const items = bilibiliRanking();
    results.platforms['bilibili'] = items.slice(0, 20).map(i => ({
      title: i.title || '',
      author: i.author || '',
      score: i.score || '',
      url: i.url || '',
    }));
  } catch (e) { results.platforms['bilibili'] = []; }

  return results;
}

function getKeywordsForCategory(category) {
  const map = {
    '运动鞋': { primary: '运动鞋 潮鞋 爆款', secondary: '球鞋 板鞋 跑步鞋' },
    '服装': { primary: '潮流服装 爆款', secondary: 'T恤 卫衣 外套' },
    '包袋': { primary: '潮流包包 爆款', secondary: '斜挎包 双肩包 手拿包' },
    '配饰': { primary: '潮流配饰 爆款', secondary: '帽子 手表 项链' },
  };
  return map[category] || { primary: category, secondary: '' };
}

module.exports = { analyzeTrends, search1688, searchTaobao, bilibiliRanking };
