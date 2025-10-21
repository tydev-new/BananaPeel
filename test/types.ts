import { BoundingBox, EditMode, HistoryState } from "../types";

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface AppState {
    history: HistoryState[];
    historyIndex: number;
    selectionBox: BoundingBox | null;
    editMode: EditMode;
    originalObjectDescription: string | null;
    prompt: string;
    error: string | null;
    isLoading: boolean;
}

export interface AppTestHandles {
    upload: (file: File) => Promise<void>;
    select: (box: BoundingBox) => Promise<void>;
    generate: () => Promise<void>;
    setPrompt: (prompt: string) => void;
    undo: () => void;
    redo: () => void;
    getState: () => AppState;
    reset: () => void;
    /**
     * Sets an exclusive logger for the test harness, overriding all other log outputs.
     * This is handled by the `setTestHarnessLogger` method in the LoggerService.
     */
    setLogger: (logger: (message: string) => void) => void;
}

export interface TestAssets {
    shapesFile: File;
}

export interface TestContext {
    handles: AppTestHandles;
    log: (message: string) => void;
    assets: TestAssets;
}

export interface TestCase {
    name: string;
    run: (context: TestContext) => Promise<void>;
}