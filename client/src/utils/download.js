import { toPng } from 'html-to-image';

/**
 * Download an image from URL
 * @param {string} url - Image URL
 * @param {string} filename - Download filename
 */
export async function downloadImage(url, filename = 'image.png') {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('下载失败:', err);
    throw new Error('图片下载失败');
  }
}

export async function downloadElementAsPng(element, filename = 'preview.png') {
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#0D0D10',
    });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('导出 PNG 失败:', err);
    throw new Error('预览导出 PNG 失败');
  }
}
