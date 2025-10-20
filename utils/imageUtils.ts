import { BoundingBox } from '../types';
import { logger } from './logger';

const SOURCE = 'imageUtils';

export const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  logger.debug(SOURCE, 'fileToBase64: Called.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      logger.debug(SOURCE, 'fileToBase64: FileReader onload triggered.');
      const result = reader.result as string;
      const mimeType = result.split(',')[0].split(':')[1].split(';')[0];
      const base64 = result.split(',')[1];
      logger.debug(SOURCE, `fileToBase64: Resolving with mimeType: ${mimeType}.`);
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => {
        logger.error(SOURCE, `fileToBase64: FileReader onerror triggered: ${String(error)}`);
        reject(error);
    };
  });
};

export const cropImage = (imageUrl: string, box: BoundingBox): Promise<string> => {
  logger.debug(SOURCE, `cropImage: Called with box: ${JSON.stringify(box)}`);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      logger.debug(SOURCE, 'cropImage: Image onload triggered.');
      const canvas = document.createElement('canvas');
      canvas.width = box.width;
      canvas.height = box.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        logger.error(SOURCE, 'cropImage: Could not get canvas context.');
        return reject('Could not get canvas context');
      }
      ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
      const dataUrl = canvas.toDataURL('image/png');
      logger.debug(SOURCE, `cropImage: Cropping successful. Resolving with data URL of length ${dataUrl.length}.`);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => {
        const errorMsg = 'Image could not be loaded for cropping.';
        logger.error(SOURCE, `cropImage: Image onerror triggered. ${errorMsg}`);
        reject(new Error(errorMsg));
    };
    logger.debug(SOURCE, 'cropImage: Setting image src to trigger load.');
    img.src = imageUrl;
  });
};

export const getMimeTypeFromDataUrl = (dataUrl: string): string => {
    return dataUrl.split(',')[0].split(':')[1].split(';')[0];
}

export const getBase64FromDataUrl = (dataUrl: string): string => {
    return dataUrl.split(',')[1];
}

export const getImageDimensions = (imageUrl: string): Promise<{width: number, height: number}> => {
  logger.debug(SOURCE, 'getImageDimensions: Called.');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      logger.debug(SOURCE, `getImageDimensions: Image onload triggered. Dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
        const errorMsg = 'Image could not be loaded for getting dimensions.';
        logger.error(SOURCE, `getImageDimensions: Image onerror triggered. ${errorMsg}`);
        reject(new Error(errorMsg));
    };
    logger.debug(SOURCE, 'getImageDimensions: Setting image src.');
    img.src = imageUrl;
  });
};


export const createFullSizeMask = (
  imageWidth: number,
  imageHeight: number,
  maskUrl: string, // this is the small, cropped mask
  box: BoundingBox,
): Promise<string> => {
  logger.debug(SOURCE, 'createFullSizeMask: Called.');
  return new Promise((resolve, reject) => {
    const maskImg = new Image();
    maskImg.crossOrigin = "Anonymous";
    maskImg.src = maskUrl;

    maskImg.onload = () => {
      logger.debug(SOURCE, 'createFullSizeMask: Mask image onload triggered.');
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        logger.error(SOURCE, 'createFullSizeMask: No context.');
        return reject('No context');
      }

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, imageWidth, imageHeight);
      ctx.drawImage(maskImg, box.x, box.y, box.width, box.height);
      
      const dataUrl = canvas.toDataURL('image/png');
      logger.debug(SOURCE, `createFullSizeMask: Resolving with full size mask data URL of length ${dataUrl.length}`);
      resolve(dataUrl);
    };
    maskImg.onerror = () => {
        const errorMsg = 'Mask image could not be loaded for creating full size mask.';
        logger.error(SOURCE, `createFullSizeMask: Mask image onerror triggered. ${errorMsg}`);
        reject(new Error(errorMsg));
    };
  });
};

export const createMaskFromBox = (
  imageWidth: number,
  imageHeight: number,
  box: BoundingBox,
): Promise<string> => {
  logger.debug(SOURCE, `createMaskFromBox: Called for box ${JSON.stringify(box)}`);
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        logger.error(SOURCE, 'createMaskFromBox: No context, resolving with empty string.');
        return resolve('');
    }

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, imageWidth, imageHeight);
    
    ctx.fillStyle = 'white';
    ctx.fillRect(box.x, box.y, box.width, box.height);
    
    const dataUrl = canvas.toDataURL('image/png');
    logger.debug(SOURCE, `createMaskFromBox: Resolving with data URL of length ${dataUrl.length}.`);
    resolve(dataUrl);
  });
};

/**
 * [DIAGNOSTIC] Analyzes a mask image to check if it's all black.
 * @param maskUrl The data URL of the mask image.
 * @returns A promise that resolves to an analysis result object.
 */
export const analyzeMask = (maskUrl: string): Promise<{ isValid: boolean; analysis: string }> => {
    logger.debug(SOURCE, 'analyzeMask: Called.');
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            logger.debug(SOURCE, 'analyzeMask: Image onload triggered.');
            const canvas = document.createElement('canvas');
            const width = img.width;
            const height = img.height;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                logger.error(SOURCE, 'analyzeMask: Could not get canvas context.');
                return reject('Could not get canvas context for mask analysis.');
            }
            ctx.drawImage(img, 0, 0);

            const SAMPLES = 100;
            const PIXEL_THRESHOLD = 10; // How dark a pixel can be and still be considered "black"
            let nonBlackPixels = 0;

            for (let i = 0; i < SAMPLES; i++) {
                const x = Math.floor(Math.random() * width);
                const y = Math.floor(Math.random() * height);
                const pixelData = ctx.getImageData(x, y, 1, 1).data;
                // Check if any of the R, G, B channels are above the threshold
                if (pixelData[0] > PIXEL_THRESHOLD || pixelData[1] > PIXEL_THRESHOLD || pixelData[2] > PIXEL_THRESHOLD) {
                    nonBlackPixels++;
                }
            }

            if (nonBlackPixels > 0) {
                resolve({
                    isValid: true,
                    analysis: `Mask is likely valid. Found ${nonBlackPixels} non-black pixels out of ${SAMPLES} samples.`
                });
            } else {
                resolve({
                    isValid: false,
                    analysis: `WARNING: Mask appears to be all black. All ${SAMPLES} sampled pixels were black.`
                });
            }
        };
        img.onerror = () => {
            const errorMsg = 'Mask image could not be loaded for analysis.';
            logger.error(SOURCE, `analyzeMask: Image onerror triggered. ${errorMsg}`);
            reject(new Error(errorMsg));
        };
        img.src = maskUrl;
    });
};