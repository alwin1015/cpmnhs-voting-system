export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Constrain maximum dimensions to 256x256 for avatars to minimize Base64 egress
  const MAX_DIM = 256;
  let outWidth = pixelCrop.width;
  let outHeight = pixelCrop.height;

  if (outWidth > MAX_DIM || outHeight > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / outWidth, MAX_DIM / outHeight);
    outWidth = Math.round(outWidth * ratio);
    outHeight = Math.round(outHeight * ratio);
  }

  // Set canvas size to the constrained size
  canvas.width = Math.max(outWidth, 1);
  canvas.height = Math.max(outHeight, 1);

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the cropped image onto the resized canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Return optimized base64 string at 0.75 quality (~15-25KB instead of 2MB)
  return canvas.toDataURL('image/jpeg', 0.75);
}
