const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GENERATED_DIR = path.join(__dirname, '..', 'uploads', 'generated');

function ensureDir() {
  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }
}

function extFromContentType(contentType = '') {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

async function cacheRemoteImage(url) {
  ensureDir();
  console.log('[AssetCache] start download:', url);
  const response = await fetch(url);
  if (!response.ok) {
    console.error('[AssetCache] download failed:', url, response.status);
    throw new Error(`下载远程图片失败 (${response.status})`);
  }
  const contentType = response.headers.get('content-type') || '';
  const ext = extFromContentType(contentType);
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const filename = `${digest}.${ext}`;
  const filePath = path.join(GENERATED_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
    console.log('[AssetCache] wrote file:', filePath, 'bytes=', buffer.length);
  } else {
    console.log('[AssetCache] file exists, reuse:', filePath);
  }
  const publicUrl = `/uploads/generated/${filename}`;
  console.log('[AssetCache] return public url:', publicUrl);
  return publicUrl;
}

async function cacheRemoteImages(urls = []) {
  const results = [];
  for (const url of urls) {
    try {
      results.push(await cacheRemoteImage(url));
    } catch (err) {
      console.error('[AssetCache] fallback to remote url due to error:', url, err.message);
      results.push(url);
    }
  }
  console.log('[AssetCache] final urls:', JSON.stringify(results));
  return results;
}

module.exports = {
  cacheRemoteImage,
  cacheRemoteImages,
};
