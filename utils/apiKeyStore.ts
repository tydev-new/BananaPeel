import { logger } from './logger';

const SOURCE = 'apiKeyStore';
const API_KEY_STORAGE_KEY = 'gemini_api_key';

/**
 * Retrieves the user-provided API key from localStorage.
 * @returns The API key string, or null if not found.
 */
export const getApiKey = (): string | null => {
    try {
        const key = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (key) {
            logger.info(SOURCE, 'getApiKey: Retrieved user-provided API key from localStorage.');
            return key;
        }
        logger.info(SOURCE, 'getApiKey: No user-provided API key found in localStorage.');
        return null;
    } catch (error) {
        logger.error(SOURCE, `getApiKey: Error accessing localStorage: ${String(error)}`);
        return null;
    }
};

/**
 * Saves the user-provided API key to localStorage.
 * @param key The API key string to save.
 */
export const setApiKey = (key: string): void => {
    try {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
        logger.info(SOURCE, 'setApiKey: Successfully saved user-provided API key to localStorage.');
    } catch (error) {
        logger.error(SOURCE, `setApiKey: Error saving to localStorage: ${String(error)}`);
    }
};

/**
 * Checks if a user-provided API key exists in localStorage.
 * @returns True if a key exists, false otherwise.
 */
export const hasApiKey = (): boolean => {
    try {
        return localStorage.getItem(API_KEY_STORAGE_KEY) !== null;
    } catch (error) {
        logger.error(SOURCE, `hasApiKey: Error accessing localStorage: ${String(error)}`);
        return false;
    }
};