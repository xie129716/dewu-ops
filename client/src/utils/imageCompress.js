export async function compressImageFile(file, {
  maxSizeBytes = 2 * 1024 * 1024,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
} = {}) {
  if (!file || file.size <= maxSizeBytes) return file;

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const { width, height } = fitSize(image.width, image.height, maxWidth, maxHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);

  const mimeType = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg');
  const blob = await canvasToBlob(canvas, mimeType, quality);
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}-compressed.${ext}`, { type: mimeType });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function fitSize(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('图片压缩失败'));
      resolve(blob);
    }, mimeType, quality);
  });
}
