/**
 * Compresses an image file using the Canvas API.
 * Resizes to max 1920x1920 and compresses to JPEG 0.8 quality.
 */
export const compressImage = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<File> => {
  // Configuration
  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1920;
  const QUALITY = 0.8;
  const THRESHOLD_SIZE = 1 * 1024 * 1024; // 1 MB

  // Return original if file is small or not an image
  if (file.size <= THRESHOLD_SIZE || !file.type.startsWith('image/')) {
    onProgress?.(100);
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        onProgress?.(25);
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // If canvas context fails, fall back to original file
          console.warn('Canvas context unavailable, skipping compression');
          onProgress?.(100);
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        onProgress?.(50);

        // Export compressed blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.warn('Compression resulted in empty blob, skipping');
              onProgress?.(100);
              resolve(file);
              return;
            }

            // Create new File object
            // We use .jpg extension for the output to match the mime type
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const newFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            console.log(`Image Compressed: ${(file.size / 1024).toFixed(1)}KB -> ${(newFile.size / 1024).toFixed(1)}KB`);
            onProgress?.(100);
            resolve(newFile);
          },
          'image/jpeg',
          QUALITY
        );
      };

      img.onerror = (err) => {
        console.warn('Image load failed during compression', err);
        resolve(file); // Fail safe
      };
    };

    reader.onerror = (err) => {
      console.warn('File read failed during compression', err);
      resolve(file); // Fail safe
    };
  });
};