import { GoogleGenAI, Modality, Type } from "@google/genai";
import { logger } from '../utils/logger';
import { addApiCallRecord } from '../utils/apiCallHistory';
import * as usageTracker from '../utils/usageTracker';

const SOURCE = 'geminiService';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_FREE_USES = 6;

type ApiKeyType = 'user' | 'default';

/**
 * Creates and returns a GoogleGenAI client instance on-demand.
 * @param apiKey The API key to use for this client.
 * @returns An instance of the GoogleGenAI client.
 */
const getGenAIClient = (apiKey: string): GoogleGenAI => {
    if (!apiKey) {
        // This case should ideally be caught before calling, but as a safeguard:
        throw new Error("API key is missing.");
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
 * A utility function to wrap API calls with retry logic and usage tracking.
 * @param apiName A friendly name for the API call for logging purposes.
 * @param apiKey The API key to use for the call.
 * @param keyType Whether the key is the 'user' or 'default' key.
 * @param apiCall The async function to call, which will receive the GenAI client.
 * @returns The result of the successful API call.
 */
async function callApiWithRetry<T>(apiName: string, apiKey: string, keyType: ApiKeyType, apiCall: (client: GoogleGenAI) => Promise<T>): Promise<T> {
    if (keyType === 'default') {
        const currentUsage = usageTracker.getUsageCount();
        if (currentUsage >= MAX_FREE_USES) {
            logger.warn(SOURCE, `Rate limit reached for default key. Usage: ${currentUsage}/${MAX_FREE_USES}`);
            throw new Error(`You have used up the free quota for the default API key. Please add your own key in Settings to continue.`);
        }
    }

    let lastError: Error | null = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const client = getGenAIClient(apiKey);
            const result = await apiCall(client);
            
            // Only increment usage on successful call with the default key
            if (keyType === 'default') {
                usageTracker.incrementUsageCount();
            }
            return result;

        } catch (error) {
            lastError = error as Error;
            const errorMessage = (error as any)?.message?.toLowerCase() || '';
            logger.warn(SOURCE, `API call [${apiName}] failed (attempt ${i + 1}/${MAX_RETRIES}): ${errorMessage}`);
            
            // If a quota error occurs while using the default key, throw the user-friendly message.
            if (keyType === 'default' && (errorMessage.includes('quota') || errorMessage.includes('billing'))) {
                 logger.error(SOURCE, `Default API key has hit a remote quota limit.`);
                 throw new Error(`The default API key's usage quota has been exceeded. Please add your own key in Settings to continue.`);
            }

            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
                const delay = RETRY_DELAY_MS * Math.pow(2, i);
                logger.info(SOURCE, `Rate limit hit. Retrying [${apiName}] in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } 
            else if (errorMessage.includes('500') || errorMessage.includes('503')) {
                logger.info(SOURCE, `Server error. Retrying [${apiName}] in ${RETRY_DELAY_MS}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } 
            else {
                break;
            }
        }
    }
    logger.error(SOURCE, `API call [${apiName}] failed after multiple retries.`);
    throw lastError || new Error(`API call [${apiName}] failed after multiple retries.`);
}


export const preprocessUserPrompt = async (apiKey: string, keyType: ApiKeyType, userPrompt: string): Promise<PreprocessedPrompt> => {
    logger.debug(SOURCE, `preprocessUserPrompt: Called with prompt: "${userPrompt}"`);
    const result = await callApiWithRetry('preprocessUserPrompt', apiKey, keyType, async (ai) => {
        const schema = {
            type: Type.OBJECT,
            properties: {
                content: { type: Type.STRING, description: "A description of the content change." },
                location: { type: Type.STRING, description: "A description of the location change." },
                scale: { type: Type.STRING, description: "A description of the scale change." },
                rotation: { type: Type.STRING, description: "A description of the rotation change." }
            },
            required: ["content", "location", "scale", "rotation"]
        };

        const instruction = `You are an expert instruction interpreter for an AI image editing tool.

The user has selected an object on a canvas. This object's original position and size are defined by a 'mask'.

Your task is to analyze the user's free-text command and convert it into a structured, unambiguous JSON object matching the provided schema. You must resolve all relative terms based on the context of the original object's mask.

**CRITICAL RULES FOR PROPERTY VALUES:**

1.  **Content:**
    *   If the user does not specify a content change, you MUST return the exact string "no change to reference object".
    *   Otherwise, return the user's content instruction (e.g., "make it a blue star").

2.  **Location:**
    *   If the user does not specify a location change, you MUST return the exact string "no change from mask location".
    *   If the user specifies a **relative** location change (e.g., "move it left"), you MUST explicitly state it is relative to the mask (e.g., "move left from mask location").
    *   If the user specifies an **absolute** location (e.g., "move to the center"), return that instruction directly (e.g., "move to the center of the image").

3.  **Scale:**
    *   If the user does not specify a scale change, you MUST return the exact string "no change from mask scale".
    *   If the user specifies a **relative** scale change (e.g., "make it bigger"), you MUST explicitly state it is relative to the mask (e.g., "make it bigger than mask scale").
    *   If the user specifies an **absolute** scale (e.g., "make it 50%"), return that instruction directly (e.g., "set scale to 50% of original").

4.  **Rotation:**
    *   If the user does not specify a rotation change, you MUST return the exact string "no change to rotation".
    *   Otherwise, return the user's rotation instruction.

The user's command is: "${userPrompt}"`;
        
        const payload = { model: 'gemini-2.5-flash', contents: { parts: [{ text: instruction }] }, config: { responseMimeType: 'application/json', responseSchema: schema } };
        logger.debug(SOURCE, `preprocessUserPrompt - Prompt Sent: "${instruction}"`);
        const response = await ai.models.generateContent(payload);
        const jsonText = response.text;
        logger.debug(SOURCE, `preprocessUserPrompt: Received JSON response: ${jsonText}`);
        
        try {
            return JSON.parse(jsonText) as PreprocessedPrompt;
        } catch (e) {
            logger.error(SOURCE, `preprocessUserPrompt: Failed to parse JSON response. Error: ${e}`);
            return { content: userPrompt, location: 'no change from mask location', scale: 'no change from mask scale', rotation: 'no change to rotation' };
        }
    });

    addApiCallRecord({ functionName: 'preprocessUserPrompt', prompt: `... The user's instruction is: "${userPrompt}". ...`, inputImages: [], outputImages: [], outputText: JSON.stringify(result, null, 2) });
    return result;
};


export const generateImage = async (apiKey: string, keyType: ApiKeyType, prompt: string): Promise<string> => {
    logger.debug(SOURCE, `generateImage: Called with prompt: "${prompt}"`);
    const result = await callApiWithRetry('generateImage', apiKey, keyType, async (ai) => {
        const payload = { model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] }, config: { responseModalities: [Modality.IMAGE] } };
        logger.debug(SOURCE, `generateImage - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        logger.debug(SOURCE, 'generateImage: Received response from API.');
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error('Image generation failed, no image part in response.');
    });

    addApiCallRecord({ functionName: 'generateImage', prompt, inputImages: [], outputImages: [{ label: 'Generated Image', url: result }] });
    return result;
};


export const editImage = async (apiKey: string, keyType: ApiKeyType, prompt: string, imageBase64: string, mimeType: string, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.debug(SOURCE, `editImage: Called with prompt: "${prompt}"`);
    const fullPrompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.\n\nApply the following instruction to the entire image: "${prompt}"`;
    
    const result = await callApiWithRetry('editImage', apiKey, keyType, async (ai) => {
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { data: imageBase64, mimeType } }, { text: fullPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        };
        logger.debug(SOURCE, `editImage - Prompt Sent: "${fullPrompt}"`);
        const response = await ai.models.generateContent(payload);
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error('Image editing failed, no image part in response.');
    });

    addApiCallRecord({ functionName: 'editImage', prompt: fullPrompt, inputImages: [{ label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` }], outputImages: [{ label: 'Edited Image', url: result }] });
    return result;
};


export const describeObject = async (apiKey: string, keyType: ApiKeyType, imageBase64: string, mimeType: string): Promise<string> => {
    logger.info(SOURCE, 'describeObject: Called.');
    const prompt = 'Your task is to identify and describe the main object in this image. Use 3 words or less. Be specific about simple geometric shapes (e.g., "red square", "blue circle"). If the image consists only of empty space or a uniform texture with no discernible object, respond with only the word "background".';

    const result = await callApiWithRetry('describeObject', apiKey, keyType, async (ai) => {
        const payload = { model: 'gemini-2.5-flash', contents: { parts: [{ inlineData: { data: imageBase64, mimeType } }, { text: prompt }] } };
        logger.debug(SOURCE, `describeObject - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        return response.text.trim().toLowerCase().replace(/[."]/g, '');
    });
    
    addApiCallRecord({ functionName: 'describeObject', prompt, inputImages: [{ label: 'Cropped Object', url: `data:${mimeType};base64,${imageBase64}` }], outputImages: [], outputText: result });
    return result;
};


export const createPreciseMask = async (apiKey: string, keyType: ApiKeyType, croppedObjectBase64: string, objectDescription: string): Promise<string> => {
    logger.info(SOURCE, `createPreciseMask: Called for object: "${objectDescription}"`);
    const prompt = `You are an expert graphic artist specializing in high-fidelity image masking.

Your task is to analyze the provided image of a single object ('${objectDescription}') and create a precise silhouette mask of it.

**CRITICAL RULES:**
1.  **Output Format:** The output image MUST be a mask. The object's silhouette MUST be solid white (#FFFFFF) and the background MUST be solid black (#000000).
2.  **No Color:** The output image MUST NOT contain any colors other than pure black and pure white. Do not include any gray pixels, anti-aliasing, or remnants of the original image's color.
3.  **Fidelity:** If the object's contour is difficult to detect, you must still provide your best estimate, but the final output must adhere to all rules above.

To be perfectly clear: your final output is a black and white image, not a color photo.`;

    const result = await callApiWithRetry('createPreciseMask', apiKey, keyType, async (ai) => {
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { data: croppedObjectBase64, mimeType: 'image/png' } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        };
        logger.debug(SOURCE, `createPreciseMask - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
        }
        throw new Error('Mask generation failed, no image part in response.');
    });

    addApiCallRecord({ functionName: 'createPreciseMask', prompt, inputImages: [{ label: 'Cropped Object', url: `data:image/png;base64,${croppedObjectBase64}` }], outputImages: [{ label: 'Generated Mask', url: `data:image/png;base64,${result}` }] });
    return result;
};


export const inpaintBackground = async (apiKey: string, keyType: ApiKeyType, imageBase64: string, mimeType: string, maskBase64: string, imageWidth: number, imageHeight: number, objectDescription: string): Promise<string> => {
    logger.info(SOURCE, 'inpaintBackground: Called.');
    const prompt = `You are an expert graphic artist. Your inputs are an Original Image and a Mask Image.

Your task is to realistically fill in the area of the Original Image that corresponds to the white area of the Mask Image. The filled-in background must seamlessly match the surrounding artistic style, lighting, and texture.
The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels.
You MUST NOT alter any part of the Original Image that falls outside the white area defined in the Mask Image.
The filled-in area should not contain a ${objectDescription}. It should only be the background.`;
    
    const result = await callApiWithRetry('inpaintBackground', apiKey, keyType, async (ai) => {
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { data: imageBase64, mimeType } }, { inlineData: { data: maskBase64, mimeType: 'image/png' } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        };
        logger.debug(SOURCE, `inpaintBackground - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error('Background inpainting failed, no image part in response.');
    });

    addApiCallRecord({ functionName: 'inpaintBackground', prompt, inputImages: [{ label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` }, { label: 'Mask', url: `data:image/png;base64,${maskBase64}` }], outputImages: [{ label: 'Inpainted Image', url: result }] });
    return result;
};


export const addModifiedObject = async (apiKey: string, keyType: ApiKeyType, inpaintedBase64: string, inpaintedMimeType: string, objectImageBase64: string, maskBase64: string, preprocessed: PreprocessedPrompt, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.info(SOURCE, 'addModifiedObject: Called.');
    const prompt = `You are an expert graphic artist.

Your task is to take a Reference Object, modify it, and place it onto a Background Image according to a set of precise instructions.

Your inputs are:
1. A Background Image.
2. A Mask Image (to show the original location).
3. An image of the Reference Object.

Your precise instructions are:

- **Content:** '${preprocessed.content}'
- **Location:** '${preprocessed.location}'
- **Scale:** '${preprocessed.scale}'
- **Rotation:** '${preprocessed.rotation}'

Place the final, modified object onto the background, ensuring it is blended seamlessly with the correct lighting and shadows. The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels.`;
    
    const result = await callApiWithRetry('addModifiedObject', apiKey, keyType, async (ai) => {
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { data: inpaintedBase64, mimeType: inpaintedMimeType } }, { inlineData: { data: maskBase64, mimeType: 'image/png' } }, { inlineData: { data: objectImageBase64, mimeType: 'image/png' } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        };
        logger.debug(SOURCE, `addModifiedObject - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error('Adding modified object failed, no image part in response.');
    });
    
    addApiCallRecord({ functionName: 'addModifiedObject', prompt, inputImages: [{ label: 'Inpainted Background', url: `data:${inpaintedMimeType};base64,${inpaintedBase64}` }, { label: 'Mask', url: `data:image/png;base64,${maskBase64}` }, { label: 'Reference Object', url: `data:image/png;base64,${objectImageBase64}` }], outputImages: [{ label: 'Final Image', url: result }] });
    return result;
};


export const addObjectToImage = async (apiKey: string, keyType: ApiKeyType, imageBase64: string, mimeType: string, maskBase64: string, prompt: string, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.debug(SOURCE, `addObjectToImage: Called with prompt: "${prompt}"`);
    const fullPrompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.

You will be given two inputs:
1.  An **Original Image**.
2.  A **Mask Image** where a white rectangle indicates the exact location and size for the new object.

Your task is to generate a new version of the Original Image that includes a new object. The object to add is: "${prompt}"

This new object must be placed exclusively within the area defined by the white rectangle in the **Mask Image**. The Mask Image is a guide for placement and scale only.

**CRITICAL INSTRUCTION:** The white rectangle from the Mask Image itself **MUST NOT** be visible in the final output image. Your final image should only contain the Original Image's content plus the newly added object, seamlessly blended.

Finally, ensure the newly added object is seamlessly blended with its surroundings, matching the original image's artistic style, lighting, and shadows for a cohesive result.`;
    
    const result = await callApiWithRetry('addObjectToImage', apiKey, keyType, async (ai) => {
        const payload = {
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { data: imageBase64, mimeType } }, { inlineData: { data: maskBase64, mimeType: 'image/png' } }, { text: fullPrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        };
        logger.debug(SOURCE, `addObjectToImage - Prompt Sent: "${fullPrompt}"`);
        const response = await ai.models.generateContent(payload);
        const parts = response.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error('Add object failed, no image part in response.');
    });

    addApiCallRecord({ functionName: 'addObjectToImage', prompt: fullPrompt, inputImages: [{ label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` }, { label: 'Mask', url: `data:image/png;base64,${maskBase64}` }], outputImages: [{ label: 'Final Image', url: result }] });
    return result;
};


export const describeImageInDetail = async (apiKey: string, keyType: ApiKeyType, imageBase64: string, mimeType: string): Promise<string> => {
    logger.info(SOURCE, 'describeImageInDetail: Called.');
    const prompt = `Your task is to analyze the provided image and produce a structured description. First, provide a one-sentence summary of the overall scene. Then, identify the main objects in the image and list them. For each object, provide a detailed, structured description including its:
1.  **Object:** A clear identification of the object (e.g., 'a red sports car', 'a tall oak tree').
2.  **Details:** A description of its appearance, color, and texture.
3.  **Size:** Its relative size (e.g., 'large', 'small compared to the house').
4.  **Location:** Its position in the scene (e.g., 'in the foreground on the left', 'in the center').
5.  **Rotation:** Its orientation (e.g., 'upright', 'tilted slightly to the right').

Finally, describe the background and the overall artistic style and lighting of the image. The output should be a clear, editable list. Do not add any conversational preamble or conclusion.`;
    
    const result = await callApiWithRetry('describeImageInDetail', apiKey, keyType, async (ai) => {
        const payload = { model: 'gemini-2.5-flash', contents: { parts: [{ inlineData: { data: imageBase64, mimeType } }, { text: prompt }] } };
        logger.debug(SOURCE, `describeImageInDetail - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        return response.text.trim();
    });

    addApiCallRecord({ functionName: 'describeImageInDetail', prompt, inputImages: [{ label: 'Image to Describe', url: `data:${mimeType};base64,${imageBase64}` }], outputImages: [], outputText: result });
    return result;
};


export const editImageWithStructuredPrompt = async (apiKey: string, keyType: ApiKeyType, originalDescription: string, editedDescription: string, imageBase64: string, mimeType: string, imageWidth: number, imageHeight: number): Promise<string> => {
    logger.info(SOURCE, 'editImageWithStructuredPrompt: Called.');
    
    const _getStructuredPromptDelta = async (): Promise<string> => {
        const prompt = `You are an expert prompt engineer. Your task is to analyze two versions of an image description, an "Original" and an "Edited" version, and produce a concise, direct, and imperative list of commands that an image generation model can use to transform the original image into the edited one.

Analyze the differences and produce a list of commands categorized into the following sections:
- **REMOVED OBJECT:** (List any objects present in the Original but not the Edited)
- **MODIFIED OBJECT:** (For each object that exists in both but has changed attributes, describe the changes, e.g., "Change the color of the red sports car to bright blue.")
- **ADDED OBJECT:** (List any objects present in the Edited but not the Original)
- **BACKGROUND:** (Describe any changes to the background)
- **STYLE:** (Describe any changes to the overall artistic style or lighting)

If a category has no changes, omit the category title entirely. If an object has changes in multiple attributes (e.g., color and location), describe them all under a single "MODIFIED OBJECT" entry.

**Example:**
If the original said "a red car" and the edited said "a blue car" and "a yellow sun in the sky", your output should be:
MODIFIED OBJECT:
- Change the color of the red car to blue.
ADDED OBJECT:
- Add a yellow sun in the sky.

Here is the Original Description:
---
${originalDescription}
---

Here is the Edited Description:
---
${editedDescription}
---`;
        // This is a sub-call, so we use the main call's API key info
        const ai = getGenAIClient(apiKey);
        const payload = { model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] } };
        logger.debug(SOURCE, `_getStructuredPromptDelta - Prompt Sent: "${prompt}"`);
        const response = await ai.models.generateContent(payload);
        return response.text.trim();
    };

    const delta = await callApiWithRetry('_getStructuredPromptDelta', apiKey, keyType, async () => _getStructuredPromptDelta());
    logger.info(SOURCE, `editImageWithStructuredPrompt: Generated delta of changes:\n${delta}`);

    const editPrompt = `Critical Constraint: The final output image MUST have a width of ${imageWidth} pixels and a height of ${imageHeight} pixels. This is a non-negotiable requirement.\n\nApply the following list of edits to the provided image:\n\n${delta}`;
    const result = await editImage(apiKey, keyType, editPrompt, imageBase64, mimeType, imageWidth, imageHeight);

    addApiCallRecord({ functionName: 'editImageWithStructuredPrompt', prompt: editPrompt, inputImages: [{ label: 'Original Image', url: `data:${mimeType};base64,${imageBase64}` }], outputImages: [{ label: 'Edited Image', url: result }], outputText: `... Generated Delta:\n---\n${delta}` });
    return result;
};