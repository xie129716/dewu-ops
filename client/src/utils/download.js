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
