import { GoogleGenAI, Modality, Type } from "@google/genai";
import { logger } from '../utils/logger';
import { getApiKey } from '../utils/apiKeyStore';
import { addApiCallRecord } from '../utils/apiCallHistory';

const SOURCE = 'geminiService';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Creates and returns a GoogleGenAI client instance.
 * It prioritizes a user-provided API key from localStorage.
 * If not found, it falls back to the environment variable.
 * This function is called on-demand by each service function.
 * @returns An instance of the GoogleGenAI client.
 */
const getGenAIClient = (): GoogleGenAI => {
    const userApiKey = getApiKey();
    const apiKey = userApiKey || process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API key is not available. Please set it in the settings or as an environment variable.");
    }

    return new GoogleGenAI({ apiKey });
};


export interface PreprocessedPrompt {
    content: string;
    location: string;
    scale: string;
    rotation: string;
}

/**
 * A utility function to retry API calls with exponential backoff for rate limiting.
 * @param apiName A friendly name for the API call for logging purposes.
 * @param apiCall The async function to call.
 * @returns The result of the successful API call.
 */
async function callApiWithRetry<T>(apiName: string, apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await apiCall();
        } catch (error) {
            lastError = error as Error;
            logger.warn(SOURCE, `API call [${apiName}] failed (attempt ${i + 1}/${MAX_RETRIES}): ${error}`);
            
            const errorMessage = (error as any)?.message?.toLowerCase() || '';
            // Retry on rate limit errors with exponential backoff
            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
                const delay = RETRY_DELAY_MS * Math.pow(2, i);
                logger.info(SOURCE, `Rate limit hit. Retrying [${apiName}] in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } 
            // Retry on transient server errors with a fixed delay
            else if (errorMessage.includes('500') || errorMessage.includes('503')) {
                logger.info(SOURCE, `Server error. Retrying [${apiName}] in ${RETRY_DELAY_MS}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } 
            // Do not retry on other client-side errors (e.g., 400 Bad Request, 403 Forbidden/API key invalid)
            else {
                break;
            }
        }
    }
    logger.error(SOURCE, `API call [${apiName}] failed after multiple retries.`);
    throw lastError || new Error(`API call [${apiName}] failed after multiple retries.`);
}


/**
 * Preprocesses a user's natural language prompt into a structured object.
 * @param userPrompt The user's raw text prompt.
 * @returns A promise that resolves to a structured object with modification details.
 */
export const preprocessUserPrompt = async (userPrompt: string): Promise<PreprocessedPrompt> => {
    logger.info(SOURCE, `preprocessUserPrompt: Called with prompt: "${userPrompt}"`);
    const result = await callApiWithRetry('preprocessUserPrompt', async () => {
        const ai = getGenAIClient();
        const schema = {
            type: Type.OBJECT,
            properties: {
                content: { type: Type.STRING, description: "A description of the content change. (e.g., 'make it blue', 'turn it into a cat')." },
                location: { type: Type.STRING, description: "A description of the location change. (e.g., 'move it to the right', 'put it in the top left corner')." },
                scale: { type: Type.STRING, description: "A description of the scale change. (e.g., 'make it twice as large', 'make it smaller')." },
                rotation: { type: Type.STRING, description: "A description of the rotation change. (e.g., 'rotate it 45 degrees', 'turn it upside down')." }
            },
            required: ["content", "location", "scale", "rotation"]
        };

        const instruction = `Analyze the user's instruction and convert it into a JSON object matching the provided schema. The user's instruction is: "${userPrompt}". For any property (content, location, scale, rotation) that is NOT mentioned in the user's instruction, you MUST return the exact string "no change" for that property's value.`;
        
        const payload = {
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: instruction }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        };

        logger.info(SOURCE, `preprocessUserPrompt - Prompt Sent: "${instruction}"`);
        const response = await ai.models.generateContent(payload);
        const jsonText = response.text;
        logger.debug(SOURCE, `preprocessUserPrompt: Received JSON response: ${jsonText}`);
        
        try {
            const parsed = JSON.parse(jsonText);
            return parsed as PreprocessedPrompt;
        } catch (e) {
            logger.error(SOURCE, `preprocessUserPrompt: Failed to parse JSON response. Error: ${e}`);
            // Fallback in case of parsing failure
            return {
                content: userPrompt,
                location: 'no change',
                scale: 'no change',
                rotation: 'no change'
            };
        }
    });

    addApiCallRecord({
        functionName: 'preprocessUserPrompt',
        prompt: `Analyze the user's instruction... The user's instruction is: "${userPrompt}". ...`,
        inputImages: [],
        outputImages: [], // No image output, just logging the call for completeness
    });
    return result;
};


/**
 * Generates a new image from a text prompt.
 * @param prompt The text prompt to generate an image from.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    logger.info(SOURCE, `generateImage: Called with prompt: "${prompt}"`);
    const result = await callApiWithRetry('generateImage', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        };
        logger.info(SOURCE, `generateImage - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'generateImage: Received response from API.');

        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    logger.debug(SOURCE, 'generateImage: Found image part in response.');
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageMimeType = part.inlineData.mimeType;
                    return `data:${imageMimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        logger.error(SOURCE, 'generateImage: No image part in response.');
        throw new Error('Image generation failed, no image part in response.');
    });

    addApiCallRecord({
        functionName: 'generateImage',
        prompt: prompt,
        inputImages: [],
        outputImages: [{ label: 'Generated Image', url: result }],
    });
    return result;
};

/**
 * Edits an existing image based on a text prompt.
 * @param prompt The text prompt describing the edit.
 * @param imageBase64 The base64 encoded string of the image to edit.
 * @param mimeType The MIME type of the image.
 * @param imageWidth The width of the original image in pixels.
 * @param imageHeight The height of the original image in pixels.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const editImage = async (prompt: string, imageBase64: string, mimeType: string, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.info(SOURCE, `editImage: Called with prompt: "${prompt}"`);
    const fullPrompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.\n\nApply the following instruction to the entire image: "${prompt}"`;
    
    const result = await callApiWithRetry('editImage', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        };
        logger.info(SOURCE, `editImage - Prompt Sent: "${fullPrompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'editImage: Received response from API.');

        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    logger.debug(SOURCE, 'editImage: Found image part in response.');
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageMimeType = part.inlineData.mimeType;
                    return `data:${imageMimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        logger.error(SOURCE, 'editImage: No image part in response.');
        throw new Error('Image editing failed, no image part in response.');
    });

    addApiCallRecord({
        functionName: 'editImage',
        prompt: fullPrompt,
        inputImages: [{ label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` }],
        outputImages: [{ label: 'Edited Image', url: result }],
    });
    return result;
};

/**
 * Describes an object in a given image.
 * @param imageBase64 The base64 encoded string of the cropped image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to a short text description of the object.
 */
export const describeObject = async (imageBase64: string, mimeType: string): Promise<string> => {
    logger.info(SOURCE, 'describeObject: Called.');
    const prompt = 'Your task is to identify and describe the main object in this image. Use 3 words or less. Be specific about simple geometric shapes (e.g., "red square", "blue circle"). If the image consists only of empty space or a uniform texture with no discernible object, respond with only the word "background".';

    const result = await callApiWithRetry('describeObject', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
        };
        logger.info(SOURCE, `describeObject - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        const description = response.text.trim().toLowerCase().replace(/[."]/g, '');
        logger.debug(SOURCE, `describeObject: Received response from API. Text: "${description}"`);
        return description;
    });
    
    addApiCallRecord({
        functionName: 'describeObject',
        prompt: prompt,
        inputImages: [{ label: 'Cropped Object', url: `data:${mimeType};base64,${imageBase64}` }],
        outputImages: [],
    });
    return result;
};

/**
 * Creates a precise black and white segmentation mask for an object in an image.
 * If the model determines it cannot create a good mask, it will return null.
 * @param imageBase64 The base64 encoded string of the cropped image.
 * @param mimeType The MIME type of the image.
 * @param objectDescription The description of the object to mask.
 * @returns A promise that resolves to the data URL of the mask image, or null on predictable failure.
 */
export const createPreciseMask = async (imageBase64: string, mimeType: string, objectDescription: string): Promise<string | null> => {
    logger.info(SOURCE, `createPreciseMask: Called with description: "${objectDescription}"`);
    const prompt = `Your primary objective is to determine if a high-fidelity segmentation mask can be created for the '${objectDescription}' in the provided image.

**Condition 1: If a clear, unambiguous mask IS possible:**
- Generate an image with a solid, pure dark black background (#000000).
- On this background, draw a solid white silhouette of the '${objectDescription}'.
- CRITICAL: The white silhouette's position, size, and shape must be an exact one-to-one match with the object in the original input image. Do not move, resize, or re-center it.

**Condition 2: If the object's borders are too ambiguous, indistinct, or blended with the background to create a precise mask:**
- You MUST abandon image generation.
- Your ONLY response must be the exact text: MASK_GENERATION_FAILED`;
    
    const result = await callApiWithRetry('createPreciseMask', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        };
        logger.info(SOURCE, `createPreciseMask - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'createPreciseMask: Received response from API.');
        
        // Check for text-based failure signal first
        if (response.text?.trim() === 'MASK_GENERATION_FAILED') {
            logger.warn(SOURCE, 'createPreciseMask: Model signaled failure to generate mask.');
            return null;
        }

        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    logger.debug(SOURCE, 'createPreciseMask: Found image part in response.');
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageMimeType = part.inlineData.mimeType;
                    return `data:${imageMimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        
        logger.error(SOURCE, 'createPreciseMask: No image part in response and no failure signal.');
        throw new Error('Mask creation failed, no image part in response.');
    });
    
    addApiCallRecord({
        functionName: 'createPreciseMask',
        prompt: prompt,
        inputImages: [{ label: 'Cropped Object', url: `data:${mimeType};base64,${imageBase64}` }],
        outputImages: result ? [{ label: 'Generated Mask', url: result }] : [],
    });
    return result;
};

/**
 * Removes an object from an image and fills in the background.
 * @param imageBase64 The base64 of the original image.
 * @param mimeType The mime type of the original image.
 * @param maskBase64 The base64 of the full-size mask of the object to remove.
 * @param imageWidth The width of the image.
 * @param imageHeight The height of the image.
 * @returns The data URL of the image with the object removed.
 */
export const inpaintBackground = async (imageBase64: string, mimeType: string, maskBase64: string, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.info(SOURCE, 'inpaintBackground: Called.');
    const prompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.

You will be given two images as input:
1.  An **Original Image** that contains an object to be removed.
2.  A **Mask Image**, where a white shape indicates the exact location and boundaries of the object to be removed.

Your task is to analyze these inputs and generate a new version of the Original Image where the object defined by the white area of the Mask Image has been completely removed. You must realistically fill in the background where the object was, ensuring the new area seamlessly matches the surrounding artistic style, lighting, and texture for a photorealistic result.`;
    
    const result = await callApiWithRetry('inpaintBackground', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { inlineData: { data: maskBase64, mimeType: 'image/png' } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        };

        logger.info(SOURCE, `inpaintBackground - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'inpaintBackground: Received response from API.');

        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageMimeType = part.inlineData.mimeType;
                    return `data:${imageMimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        logger.error(SOURCE, 'inpaintBackground: No image part in response.');
        throw new Error('Background inpainting failed, no image part in response.');
    });

    addApiCallRecord({
        functionName: 'inpaintBackground',
        prompt: prompt,
        inputImages: [
            { label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` },
            { label: 'Mask', url: `data:image/png;base64,${maskBase64}` },
        ],
        outputImages: [{ label: 'Inpainted Image', url: result }],
    });
    return result;
};

/**
 * Adds a modified object back onto an inpainted background.
 * @param inpaintedBase64 The base64 of the background image.
 * @param inpaintedMimeType The mime type of the background image.
 * @param objectImageBase64 The base64 of the original cropped object for reference.
 * @param maskBase64 The base64 of the mask indicating the object's original location.
 * @param preprocessed The structured prompt object.
 * @param imageWidth The width of the image.
 * @param imageHeight The height of the image.
 * @returns The data URL of the final image.
 */
export const addModifiedObject = async (inpaintedBase64: string, inpaintedMimeType: string, objectImageBase64: string, maskBase64: string, preprocessed: PreprocessedPrompt, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.info(SOURCE, 'addModifiedObject: Called.');
    const prompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.

Your task is to modify a reference object and place it onto a background image. You will be given:
1.  A background image where the original object has been removed.
2.  A mask indicating the object's **original position and scale**.
3.  A reference image of the original object.
4.  A set of structured instructions.

First, apply the 'Content Change' to the reference object:
- Content Change: '${preprocessed.content}'

Next, apply the following spatial transformations. For each transformation, if the instruction is **relative** (e.g., "move left", "make it larger", "rotate slightly"), it should be interpreted relative to the object's original state as defined by the reference image and the mask. If the instruction is **absolute** (e.g., "move to the center", "set scale to 50%", "set rotation to 90 degrees"), it defines the final state.
- Location Change: '${preprocessed.location}'
- Scale Change: '${preprocessed.scale}'
- Rotation Change: '${preprocessed.rotation}'

Finally, place this newly modified object onto the background image at its final calculated location. Ensure the result is blended seamlessly, matching the original image's artistic style, lighting, and shadows for a cohesive result.`;
    
    const result = await callApiWithRetry('addModifiedObject', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: inpaintedBase64, mimeType: inpaintedMimeType } },
                    { inlineData: { data: maskBase64, mimeType: 'image/png' } },
                    { inlineData: { data: objectImageBase64, mimeType: 'image/png' } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        };
        logger.info(SOURCE, `addModifiedObject - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'addModifiedObject: Received response from API.');

        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageMimeType = part.inlineData.mimeType;
                    return `data:${imageMimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        logger.error(SOURCE, 'addModifiedObject: No image part in response.');
        throw new Error('Adding modified object failed, no image part in response.');
    });
    
    addApiCallRecord({
        functionName: 'addModifiedObject',
        prompt: prompt,
        inputImages: [
            { label: 'Inpainted Background', url: `data:${inpaintedMimeType};base64,${inpaintedBase64}` },
            { label: 'Mask', url: `data:image/png;base64,${maskBase64}` },
            { label: 'Reference Object', url: `data:image/png;base64,${objectImageBase64}` },
        ],
        outputImages: [{ label: 'Final Image', url: result }],
    });
    return result;
};

/**
 * Adds a new object to a specified area in an image.
 * @param imageBase64 The base64 of the original image.
 * @param mimeType The mime type of the original image.
 * @param maskBase64 The base64 of the mask indicating where to add the object.
 * @param prompt The user's prompt describing the object to add.
 * @param imageWidth The width of the image.
 * @param imageHeight The height of the image.
 * @returns The data URL of the image with the new object.
 */
export const addObjectToImage = async (imageBase64: string, mimeType: string, maskBase64: string, prompt: string, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.info(SOURCE, `addObjectToImage: Called with prompt: "${prompt}"`);
    const fullPrompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.

Add the following object into the area defined by the provided white mask: "${prompt}"`;
    
    const result = await callApiWithRetry('addObjectToImage', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { inlineData: { data: maskBase64, mimeType: 'image/png' } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        };

        logger.info(SOURCE, `addObjectToImage - Prompt Sent: "${fullPrompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'addObjectToImage: Received response from API.');

        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageMimeType = part.inlineData.mimeType;
                    return `data:${imageMimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        logger.error(SOURCE, 'addObjectToImage: No image part in response.');
        throw new Error('Add object failed, no image part in response.');
    });

    addApiCallRecord({
        functionName: 'addObjectToImage',
        prompt: fullPrompt,
        inputImages: [
            { label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` },
            { label: 'Mask', url: `data:image/png;base64,${maskBase64}` },
        ],
        outputImages: [{ label: 'Final Image', url: result }],
    });
    return result;
};


/**
 * Generates a detailed, structured description of an image for editing.
 * @param imageBase64 The base64 encoded string of the image to describe.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the detailed text description.
 */
export const describeImageInDetail = async (imageBase64: string, mimeType: string): Promise<string> => {
    logger.info(SOURCE, 'describeImageInDetail: Called.');
    const prompt = `Your task is to analyze the provided image and produce a structured description. First, provide a one-sentence summary of the overall scene. Then, identify the main objects in the image and list them. For each object, provide a detailed, structured description including its:
1.  **Object:** A clear identification of the object (e.g., 'a red sports car', 'a tall oak tree').
2.  **Details:** A description of its appearance, color, and texture.
3.  **Size:** Its relative size (e.g., 'large', 'small compared to the house').
4.  **Location:** Its position in the scene (e.g., 'in the foreground on the left', 'in the center').
5.  **Rotation:** Its orientation (e.g., 'upright', 'tilted slightly to the right').

Finally, describe the background and the overall artistic style and lighting of the image. The output should be a clear, editable list. Do not add any conversational preamble or conclusion.`;
    
    const result = await callApiWithRetry('describeImageInDetail', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
        };
        logger.info(SOURCE, `describeImageInDetail - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        const description = response.text.trim();
        logger.debug(SOURCE, `describeImageInDetail: Received response from API. Text: "${description}"`);
        return description;
    });

    addApiCallRecord({
        functionName: 'describeImageInDetail',
        prompt: prompt,
        inputImages: [{ label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` }],
        outputImages: [],
    });
    return result;
};

/**
 * Compares two text descriptions and returns a summary of the changes.
 * @param originalDescription The original text.
 * @param editedDescription The user-edited text.
 * @returns A promise that resolves to a concise summary of the edits.
 */
const _getStructuredPromptDelta = async (originalDescription: string, editedDescription: string): Promise<string> => {
    logger.info(SOURCE, '_getStructuredPromptDelta: Called.');
    const prompt = `You are an expert in analyzing text changes. Compare the 'Original Description' with the 'Edited Description'. Your task is to return a concise, natural-language summary of only the changes that were made. For example, if 'a red car' was changed to 'a blue sports car', your response should be 'change the red car to a blue sports car'. Do not describe parts that are unchanged.

Original Description:
${originalDescription}

Edited Description:
${editedDescription}`;
    
    const result = await callApiWithRetry('_getStructuredPromptDelta', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
        };
        logger.info(SOURCE, `_getStructuredPromptDelta - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        const delta = response.text.trim();
        logger.debug(SOURCE, `_getStructuredPromptDelta: Received delta from API: "${delta}"`);
        return delta;
    });

    addApiCallRecord({
        functionName: '_getStructuredPromptDelta',
        prompt: prompt,
        inputImages: [],
        outputImages: [],
    });
    return result;
};

/**
 * Edits an image based on the delta between an original and an edited structured description.
 * @param originalDescription The original, AI-generated description.
 * @param editedDescription The user's modified description.
 * @param imageBase64 The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image.
 * @param imageWidth The width of the original image in pixels.
 * @param imageHeight The height of the original image in pixels.
 * @returns A promise that resolves to the data URL of the newly generated image.
 */
export const editImageWithStructuredPrompt = async (originalDescription: string, editedDescription: string, imageBase64: string, mimeType: string, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.info(SOURCE, 'editImageWithStructuredPrompt: Called.');

    const delta = await _getStructuredPromptDelta(originalDescription, editedDescription);
    
    const fullPrompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.

Apply the following edit to the provided image: "${delta}"

Preserve all other aspects of the image that are not related to this edit.`;

    const result = await callApiWithRetry('editImageWithStructuredPrompt', async () => {
        const ai = getGenAIClient();
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: mimeType } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        };
        logger.info(SOURCE, `editImageWithStructuredPrompt - Prompt Sent: "${fullPrompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'editImageWithStructuredPrompt: Received response from API.');

        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    logger.debug(SOURCE, 'editImageWithStructuredPrompt: Found image part in response.');
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageMimeType = part.inlineData.mimeType;
                    return `data:${imageMimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        logger.error(SOURCE, 'editImageWithStructuredPrompt: No image part in response.');
        throw new Error('Structured image editing failed, no image part in response.');
    });

    addApiCallRecord({
        functionName: 'editImageWithStructuredPrompt',
        prompt: fullPrompt,
        inputImages: [{ label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` }],
        outputImages: [{ label: 'Edited Image', url: result }],
    });
    return result;
};