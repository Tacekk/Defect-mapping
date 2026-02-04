import imageCompression from 'browser-image-compression';

const DEFAULT_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
};

export async function compressImage(
  file: File,
  options?: Partial<typeof DEFAULT_OPTIONS>
): Promise<File> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    const compressedFile = await imageCompression(file, mergedOptions);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

export async function compressImageToBlob(
  file: File,
  options?: Partial<typeof DEFAULT_OPTIONS>
): Promise<Blob> {
  const compressedFile = await compressImage(file, options);
  return compressedFile;
}

export function getImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
