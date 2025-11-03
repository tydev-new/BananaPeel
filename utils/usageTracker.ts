import { logger } from './logger';

const SOURCE = 'usageTracker';
const USAGE_COUNT_STORAGE_KEY = 'banana_peel_usage_count';

/**
 * Retrieves the current usage count for the default API key from localStorage.
 * @returns The usage count, or 0 if not found or invalid.
 */
export const getUsageCount = (): number => {
    try {
        const countStr = localStorage.getItem(USAGE_COUNT_STORAGE_KEY);
        if (countStr) {
            const count = parseInt(countStr, 10);
            if (!isNaN(count)) {
                return count;
            }
        }
        return 0;
    } catch (error) {
        logger.error(SOURCE, `getUsageCount: Error accessing localStorage: ${String(error)}`);
        return 0;
    }
};

/**
 * Increments the usage count for the default API key in localStorage.
 */
export const incrementUsageCount = (): void => {
    try {
        const currentCount = getUsageCount();
        const newCount = currentCount + 1;
        localStorage.setItem(USAGE_COUNT_STORAGE_KEY, String(newCount));
        logger.info(SOURCE, `incrementUsageCount: Usage count incremented to ${newCount}.`);
    } catch (error) {
        logger.error(SOURCE, `incrementUsageCount: Error saving to localStorage: ${String(error)}`);
    }
};