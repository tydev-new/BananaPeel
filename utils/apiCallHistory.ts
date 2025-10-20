import { v4 as uuidv4 } from 'uuid';
import { ApiCallRecord } from '../types';

const MAX_HISTORY = 5;
let history: ApiCallRecord[] = [];
let listeners: ((history: ApiCallRecord[]) => void)[] = [];

const notify = () => {
    // Notify with a copy to prevent mutation issues
    listeners.forEach(listener => listener([...history]));
};

/**
 * Subscribes a listener function to be called whenever the API call history changes.
 * @param listener The function to call with the updated history.
 * @returns An unsubscribe function.
 */
export const subscribe = (listener: (history: ApiCallRecord[]) => void): (() => void) => {
    listeners.push(listener);
    // Return an unsubscribe function
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
};

/**
 * Adds a new record to the API call history.
 * @param record The partial record of the API call.
 */
export const addApiCallRecord = (record: Omit<ApiCallRecord, 'id' | 'timestamp'>) => {
    const newRecord: ApiCallRecord = {
        ...record,
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    };
    // Add to the beginning of the array
    history.unshift(newRecord);
    // Trim the array if it exceeds the max length
    if (history.length > MAX_HISTORY) {
        history.pop();
    }
    notify();
};