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

            // Don't sample if image is tiny
            if (width < 5 || height < 5) {
                resolve({
                    isValid: false,
                    analysis: `WARNING: Mask is too small (${width}x${height}) to analyze reliably. Assuming invalid.`
                });
                return;
            }

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

/**
 * Creates a full-size mask by placing a smaller, cropped mask onto a black background.
 * @param imageWidth The width of the final, full-size mask.
 * @param imageHeight The height of the final, full-size mask.
 * @param croppedMaskBase64 The base64 string of the precise mask generated for the cropped object.
 * @param box The bounding box defining where to place the cropped mask.
 * @returns A promise that resolves to the data URL of the final, composite mask.
 */
export const compositeMask = (
    imageWidth: number,
    imageHeight: number,
    croppedMaskBase64: string,
    box: BoundingBox
): Promise<string> => {
    logger.debug(SOURCE, `compositeMask: Called for box ${JSON.stringify(box)}`);
    return new Promise((resolve, reject) => {
        const croppedMaskImg = new Image();
        croppedMaskImg.onload = () => {
            logger.debug(SOURCE, `compositeMask: Loaded mask image with dimensions ${croppedMaskImg.width}x${croppedMaskImg.height} for compositing.`);
            const canvas = document.createElement('canvas');
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for compositing mask.'));
            }

            // Fill the entire canvas with black
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, imageWidth, imageHeight);

            // Draw the small, precise mask at the correct location
            ctx.drawImage(croppedMaskImg, box.x, box.y);

            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
        };
        croppedMaskImg.onerror = () => reject(new Error('Cropped mask image could not be loaded for compositing.'));
        croppedMaskImg.src = `data:image/png;base64,${croppedMaskBase64}`;
    });
};

/**
 * Scales a base64 image to a target width and height.
 * @param imageBase64 The base64 string of the image to scale.
 * @param width The target width.
 * @param height The target height.
 * @returns A promise that resolves to the base64 string of the scaled image.
 */
export const scaleImage = (imageBase64: string, width: number, height: number): Promise<string> => {
    logger.debug(SOURCE, `scaleImage: Called to scale image to ${width}x${height}`);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for scaling image.'));
            }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl.split(',')[1]); // Return just the base64 part
        };
        img.onerror = () => reject(new Error('Image could not be loaded for scaling.'));
        img.src = `data:image/png;base64,${imageBase64}`;
    });
};

/**
 * Programmatically cleans a mask image, forcing all non-black pixels to be solid white.
 * @param imageBase64 The base64 string of the mask image to clean.
 * @returns A promise that resolves to the base64 string of the binarized mask.
 */
export const binarizeMask = (imageBase64: string): Promise<string> => {
    logger.debug(SOURCE, 'binarizeMask: Called to clean mask by forcing it to black and white.');
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const width = img.width;
            const height = img.height;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for binarizing mask.'));
            }
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const BRIGHTNESS_THRESHOLD = 40; // Average brightness (0-255) to distinguish dark from light pixels.

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Calculate the average brightness of the pixel.
                const averageBrightness = (r + g + b) / 3;
                
                if (averageBrightness > BRIGHTNESS_THRESHOLD) {
                    // Pixel is light enough, set to solid white.
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                } else {
                    // Pixel is dark, set to solid black.
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                }
                // Ensure alpha is always fully opaque for a clean mask
                data[i + 3] = 255;
            }

            ctx.putImageData(imageData, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl.split(',')[1]); // Return just the base64 part
        };
        img.onerror = () => reject(new Error('Image could not be loaded for binarization.'));
        img.src = `data:image/png;base64,${imageBase64}`;
    });
};

/**
 * [DIAGNOSTIC] Creates a transparent "hole" in an image based on a mask.
 * This implementation uses direct pixel manipulation for maximum reliability.
 * @param imageUrl The data URL of the original image.
 * @param maskUrl The data URL of the mask to apply.
 * @returns A promise that resolves to the data URL of the image with the masked area erased.
 */
export const punchOutMask = (imageUrl: string, maskUrl: string): Promise<string> => {
    logger.debug(SOURCE, 'punchOutMask: Called with new pixel manipulation logic.');
    return new Promise((resolve, reject) => {
        const originalImg = new Image();
        originalImg.crossOrigin = "Anonymous";

        originalImg.onload = () => {
            const maskImg = new Image();
            maskImg.crossOrigin = "Anonymous";
            
            maskImg.onload = () => {
                const canvas = document.createElement('canvas');
                const width = originalImg.naturalWidth;
                const height = originalImg.naturalHeight;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for punching out mask.'));
                }

                // Temp canvas for mask to read its pixel data
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = width;
                maskCanvas.height = height;
                const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
                if (!maskCtx) {
                    return reject(new Error('Could not get mask canvas context.'));
                }
                
                // 1. Draw original image to the main (visible) canvas
                ctx.drawImage(originalImg, 0, 0);
                
                // 2. Draw mask to the temporary (hidden) canvas
                maskCtx.drawImage(maskImg, 0, 0, width, height);

                // 3. Get the raw pixel data for both canvases
                const originalImageData = ctx.getImageData(0, 0, width, height);
                const maskImageData = maskCtx.getImageData(0, 0, width, height);

                const originalData = originalImageData.data;
                const maskData = maskImageData.data;
                
                const BRIGHTNESS_THRESHOLD = 128;

                // 4. Iterate through every pixel of the mask
                for (let i = 0; i < maskData.length; i += 4) {
                    // Check the brightness of the mask pixel (the R channel is sufficient for a B&W mask)
                    if (maskData[i] > BRIGHTNESS_THRESHOLD) {
                        // If the mask pixel is white, make the corresponding pixel
                        // in the original image fully transparent.
                        originalData[i + 3] = 0; // Set Alpha to 0
                    }
                }

                // 5. Write the modified pixel data back to the main canvas
                ctx.putImageData(originalImageData, 0, 0);

                resolve(canvas.toDataURL('image/png'));
            };
            
            maskImg.onerror = () => reject(new Error('Mask image could not be loaded for punch-out.'));
            maskImg.src = maskUrl;
        };
        
        originalImg.onerror = () => reject(new Error('Original image could not be loaded for punch-out.'));
        originalImg.src = imageUrl;
    });
};