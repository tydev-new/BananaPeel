import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import CanvasArea from './components/CanvasArea';
import PromptPanel from './components/PromptPanel';
import TestHarness from './components/TestHarness';
import LogViewer from './components/LogViewer';
import ConfirmationModal from './components/ConfirmationModal';
import SettingsModal from './components/SettingsModal';
import ApiCallInspectorModal from './components/ApiCallInspectorModal';
import { BoundingBox, ApiCallRecord } from './types';
import * as geminiService from './services/geminiService';
import * as imageUtils from './utils/imageUtils';
import * as apiKeyStore from './utils/apiKeyStore';
import * as apiCallHistoryStore from './utils/apiCallHistory';
import { AppState, AppTestHandles } from './test/types';
import { logger, LogLevel } from './utils/logger';
import { DownloadIcon, RedoIcon, UndoIcon } from './components/icons';

type EditMode = 'modify' | 'add' | null;
type PromptMode = 'freeform' | 'structured';

// This defines a complete, atomic snapshot of the data needed to delete an object.
type DeleteActionData = {
    box: BoundingBox;
    description: string;
    image: {
        url: string;
        mimeType: string;
    };
};

type ConfirmationAction =
    | { type: 'newImage'; message: string }
    | { type: 'deleteObject'; message: string; data: DeleteActionData };


type AppHandlers = Omit<AppTestHandles, 'getState' | 'setPrompt' | 'setLogger'>;

const SOURCE = 'App';

const App: React.FC = () => {
    // History state
    const [history, setHistory] = useState<{ url: string; mimeType: string }[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    // UI/Loading state
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessingSelection, setIsProcessingSelection] = useState<boolean>(false);
    const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [confirmationProps, setConfirmationProps] = useState<ConfirmationAction | null>(null);

    // Selection/Editing state
    const [selectionBox, setSelectionBox] = useState<BoundingBox | null>(null);
    const [editMode, setEditMode] = useState<EditMode>(null);
    const [originalObjectDescription, setOriginalObjectDescription] = useState<string | null>(null);
    const [sessionImageDimensions, setSessionImageDimensions] = useState<{ width: number; height: number; } | null>(null);
    const [promptMode, setPromptMode] = useState<PromptMode>('freeform');
    const [originalStructuredPrompt, setOriginalStructuredPrompt] = useState<string | null>(null);
    
    // Test mode state
    const [isTestMode, setIsTestMode] = useState(false);
    const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);

    // Log viewer state
    const [sessionLogs, setSessionLogs] = useState<string[]>([]);
    const [isLogViewerVisible, setIsLogViewerVisible] = useState<boolean>(true);
    
    // API Inspector State
    const [apiCallHistory, setApiCallHistory] = useState<ApiCallRecord[]>([]);
    const [isApiInspectorOpen, setIsApiInspectorOpen] = useState(false);

    // --- State Ref for Testing ---
    const stateRef = useRef<AppState>(null!);
    
    // Ref to hold latest handlers to avoid stale closures
    const handlersRef = useRef<AppHandlers>(null!);


    const currentImage = useMemo(() => {
        if (historyIndex >= 0 && historyIndex < history.length) {
            return history[historyIndex];
        }
        return null;
    }, [history, historyIndex]);

    const isInEditState = !!currentImage;
    const isSubEditing = useMemo(() => editMode === 'modify' || editMode === 'add', [editMode]);

    const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
    const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history]);

    // --- Session & Test Logging Setup ---
    useEffect(() => {
        logger.setLevel(LogLevel.INFO);
        const logCollector = (message: string) => {
            setSessionLogs(prev => [...prev, message]);
        };
        logger.addOutput(logCollector);

        // Subscribe to API call history updates
        const unsubscribe = apiCallHistoryStore.subscribe(setApiCallHistory);

        // Cleanup on unmount
        return () => {
            logger.removeOutput(logCollector);
            unsubscribe();
        };
    }, []);

    // Effect to reset prompt mode on undo/redo
    useEffect(() => {
        if (historyIndex !== -1) {
            logger.info(SOURCE, `useEffect[historyIndex]: History changed to index ${historyIndex}. Resetting prompt mode to freeform.`);
            setPromptMode('freeform');
            setPrompt('');
            setOriginalStructuredPrompt(null);
        }
    }, [historyIndex]);

    // --- History Management ---
    const addHistoryState = useCallback(async (newImage: { url: string; mimeType: string }) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newImage);
        logger.info(SOURCE, `STATE: Adding to history. New length: ${newHistory.length}, new index: ${newHistory.length - 1}.`);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        // Set session dimensions if this is the first image in a new session.
        if (newHistory.length === 1) {
            logger.info(SOURCE, 'Setting new session image dimensions from generated image.');
            const dims = await imageUtils.getImageDimensions(newImage.url);
            setSessionImageDimensions(dims);
            logger.info(SOURCE, `Session dimensions SET to: { width: ${dims.width}, height: ${dims.height} }`);
        }
    }, [history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (canUndo) {
            logger.info(SOURCE, `handleUndo: Called. Index from ${historyIndex} to ${historyIndex - 1}.`);
            setHistoryIndex(prev => prev - 1);
        } else {
            logger.warn(SOURCE, 'handleUndo: Called but cannot undo.');
        }
    }, [canUndo, historyIndex]);

    const handleRedo = useCallback(() => {
        if (canRedo) {
            logger.info(SOURCE, `handleRedo: Called. Index from ${historyIndex} to ${historyIndex + 1}.`);
            setHistoryIndex(prev => prev - 1);
        } else {
            logger.warn(SOURCE, 'handleRedo: Called but cannot redo.');
        }
    }, [canRedo, historyIndex]);

    const handleReset = useCallback(() => {
        logger.info(SOURCE, 'handleReset: Called. Resetting all application state.');
        setHistory([]);
        setHistoryIndex(-1);
        setPrompt('');
        setIsLoading(false);
        setIsProcessingSelection(false);
        setError(null);
        setSelectionBox(null);
        setEditMode(null);
        setOriginalObjectDescription(null);
        setSessionLogs([]); // Also clear logs on reset
        setSessionImageDimensions(null); // Clear session dimensions
        setPromptMode('freeform'); // Reset prompt mode
        setOriginalStructuredPrompt(null); // Reset structured prompt state
    }, []);

    const handleNewImage = useCallback(() => {
        logger.info(SOURCE, 'handleNewImage: Called.');
        setConfirmationProps({
            message: "Starting a new image will clear your current canvas and history. Are you sure you want to continue?",
            type: 'newImage',
        });
    }, []);
    

    // --- Core Action Handlers ---
    const withLoading = useCallback(async <T,>(action: () => Promise<T>, type: 'loading' | 'processing' = 'loading'): Promise<T | undefined> => {
        logger.info(SOURCE, `withLoading: Setting loading state to true (type: ${type}).`);
        setError(null);
        if (type === 'processing') setIsProcessingSelection(true);
        else setIsLoading(true);
        
        try {
            const result = await action();
            return result;
        } catch (error: any) {
            let errorMessage = 'An unknown error occurred.';
            if (error && typeof error === 'object' && 'message' in error) {
                const nestedMessage = (error as any).message;
                if (typeof nestedMessage === 'string') {
                    if (nestedMessage.toLowerCase().includes('responsible ai')) {
                        errorMessage = "The prompt was blocked for safety reasons. Please try a different prompt.";
                    } else if (nestedMessage.toLowerCase().includes('api key not valid')) {
                        errorMessage = "Your API key is not valid. Please check it in Settings.";
                    } else if (nestedMessage.toLowerCase().includes('api key is not available')) {
                        errorMessage = "API key not found. Please add it in Settings.";
                    }
                    else {
                        errorMessage = nestedMessage;
                    }
                }
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            logger.error(SOURCE, `withLoading: Caught error: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            logger.info(SOURCE, 'withLoading: Setting loading state to false.');
            if (type === 'processing') setIsProcessingSelection(false);
            else setIsLoading(false);
        }
        return undefined;
    }, []);
    

    const handleGenerate = useCallback(async () => {
        logger.info(SOURCE, 'handleGenerate: Called.');
        await withLoading(async () => {
            let newImageUrl: string | undefined;

            if (promptMode === 'structured') {
                logger.info(SOURCE, `handleGenerate: In 'structured' edit mode.`);
                if (!currentImage || !sessionImageDimensions || !originalStructuredPrompt) {
                    throw new Error("Cannot perform structured edit without current image, dimensions, and original prompt.");
                }
                newImageUrl = await geminiService.editImageWithStructuredPrompt(
                    originalStructuredPrompt,
                    prompt,
                    imageUtils.getBase64FromDataUrl(currentImage.url),
                    currentImage.mimeType,
                    sessionImageDimensions.width,
                    sessionImageDimensions.height
                );

            } else if ((editMode === 'modify' || editMode === 'add') && selectionBox) {
                logger.info(SOURCE, `handleGenerate: In edit mode '${editMode}'.`);
                if (!currentImage || !sessionImageDimensions) {
                    throw new Error("Cannot edit without a current image and session dimensions.");
                }

                const currentImageDims = await imageUtils.getImageDimensions(currentImage.url);

                if (editMode === 'modify') {
                    logger.info(SOURCE, 'handleGenerate: Modifying existing object.');
                    const preprocessed = await geminiService.preprocessUserPrompt(prompt);
                    const objectImageBase64 = await imageUtils.cropImage(currentImage.url, selectionBox);
                    const description = originalObjectDescription || 'the selected object';
                    
                    let fullMaskUrl: string;
                    const preciseMaskUrl = await geminiService.createPreciseMask(objectImageBase64, 'image/png', description);
                    
                    if (preciseMaskUrl) {
                        logger.info(SOURCE, 'AI mask generation successful. Creating full size mask.');
                        fullMaskUrl = await imageUtils.createFullSizeMask(currentImageDims.width, currentImageDims.height, preciseMaskUrl, selectionBox);
                    } else {
                        logger.warn(SOURCE, 'AI mask generation failed. Falling back to box mask.');
                        fullMaskUrl = await imageUtils.createMaskFromBox(currentImageDims.width, currentImageDims.height, selectionBox);
                    }

                    const maskBase64 = imageUtils.getBase64FromDataUrl(fullMaskUrl);
                    
                    const inpaintedImageUrl = await geminiService.inpaintBackground(
                        imageUtils.getBase64FromDataUrl(currentImage.url),
                        currentImage.mimeType,
                        maskBase64,
                        sessionImageDimensions.width,
                        sessionImageDimensions.height
                    );

                    newImageUrl = await geminiService.addModifiedObject(
                        imageUtils.getBase64FromDataUrl(inpaintedImageUrl),
                        imageUtils.getMimeTypeFromDataUrl(inpaintedImageUrl),
                        objectImageBase64,
                        maskBase64,
                        preprocessed,
                        sessionImageDimensions.width,
                        sessionImageDimensions.height
                    );
                } else { // 'add' mode
                    logger.info(SOURCE, 'handleGenerate: Adding new object to selection.');
                    const fullMaskUrl = await imageUtils.createMaskFromBox(currentImageDims.width, currentImageDims.height, selectionBox);
                    const maskBase64 = imageUtils.getBase64FromDataUrl(fullMaskUrl);
                    
                    newImageUrl = await geminiService.addObjectToImage(
                        imageUtils.getBase64FromDataUrl(currentImage.url),
                        currentImage.mimeType,
                        maskBase64,
                        prompt,
                        sessionImageDimensions.width,
                        sessionImageDimensions.height
                    );
                }

            } else if (isInEditState && currentImage && sessionImageDimensions) {
                logger.info(SOURCE, 'handleGenerate: Performing global edit on current image.');
                newImageUrl = await geminiService.editImage(
                    prompt,
                    imageUtils.getBase64FromDataUrl(currentImage.url),
                    currentImage.mimeType,
                    sessionImageDimensions.width,
                    sessionImageDimensions.height
                );
            } else {
                logger.info(SOURCE, 'handleGenerate: Generating new image from prompt.');
                newImageUrl = await geminiService.generateImage(prompt);
            }

            if (newImageUrl) {
                const newMimeType = imageUtils.getMimeTypeFromDataUrl(newImageUrl);
                await addHistoryState({ url: newImageUrl, mimeType: newMimeType });
                handleClearSelection();
            } else {
                 throw new Error('Image generation failed to return an image.');
            }
        });
    }, [prompt, currentImage, selectionBox, editMode, originalObjectDescription, addHistoryState, withLoading, sessionImageDimensions, isInEditState, promptMode, originalStructuredPrompt]);


    const handleUpload = useCallback(async (file: File) => {
        logger.info(SOURCE, `handleUpload: Called with file: ${file.name}`);
        await withLoading(async () => {
            const { base64, mimeType } = await imageUtils.fileToBase64(file);
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            logger.info(SOURCE, 'handleUpload: Starting new history session with uploaded image.');
            setHistory([{ url: dataUrl, mimeType: mimeType }]);
            setHistoryIndex(0);
            
            logger.info(SOURCE, 'Setting new session image dimensions from uploaded image.');
            const dims = await imageUtils.getImageDimensions(dataUrl);
            setSessionImageDimensions(dims);
            logger.info(SOURCE, `Session dimensions SET to: { width: ${dims.width}, height: ${dims.height} }`);

            handleClearSelection();
        });
    }, [withLoading]);


    const handleSelect = useCallback(async (box: BoundingBox) => {
        logger.info(SOURCE, `handleSelect: Called with box: ${JSON.stringify(box)}`);
        
        await withLoading(async () => {
            if (!currentImage) return;

            const croppedImageBase64 = await imageUtils.cropImage(currentImage.url, box);
            setDebugImageUrl(`data:image/png;base64,${croppedImageBase64}`);
            
            const description = await geminiService.describeObject(croppedImageBase64, 'image/png');
            
            if (description === 'background') {
                logger.info(SOURCE, 'handleSelect: Selection is background. Entering "add" mode.');
                setEditMode('add');
            } else {
                logger.info(SOURCE, `handleSelect: Found object "${description}". Entering "modify" mode.`);
                setOriginalObjectDescription(description);
                setEditMode('modify');
            }
            setSelectionBox(box); // Set selection box after analysis
        }, 'processing');
    }, [currentImage, withLoading]);
    
    const handleClearSelection = useCallback(() => {
        logger.info(SOURCE, 'handleClearSelection: Called.');
        setSelectionBox(null);
        setEditMode(null);
        setOriginalObjectDescription(null);
        setPrompt('');
        setPromptMode('freeform'); // Also reset prompt mode
        setOriginalStructuredPrompt(null);
    }, []);
    
    const handleSetPromptMode = useCallback(async (mode: PromptMode) => {
        logger.info(SOURCE, `handleSetPromptMode: Switching to ${mode} mode.`);
        setPromptMode(mode);

        if (mode === 'structured') {
            await withLoading(async () => {
                if (!currentImage) {
                    throw new Error("Cannot generate structured prompt without an image.");
                }
                setPrompt("Generating detailed description...");
                const description = await geminiService.describeImageInDetail(
                    imageUtils.getBase64FromDataUrl(currentImage.url),
                    currentImage.mimeType
                );
                setPrompt(description);
                setOriginalStructuredPrompt(description);
            }, 'processing');
        } else {
            setPrompt(''); // Clear prompt when switching back to freeform
            setOriginalStructuredPrompt(null);
        }
    }, [currentImage, withLoading]);

    const handleRequestDeleteObject = useCallback(() => {
        logger.info(SOURCE, 'handleRequestDeleteObject: Called.');
        if (!selectionBox || !originalObjectDescription || !currentImage) {
            logger.error(SOURCE, 'handleRequestDeleteObject: Cannot delete, missing selection data or current image.');
            return;
        }
        setConfirmationProps({
            message: "This will permanently remove the selected object. This action can be undone. Are you sure?",
            type: 'deleteObject',
            data: {
                box: selectionBox,
                description: originalObjectDescription,
                image: { // Create a complete snapshot to ensure the operation is atomic
                    url: currentImage.url,
                    mimeType: currentImage.mimeType,
                }
            }
        });
    }, [selectionBox, originalObjectDescription, currentImage]);

    const handleConfirm = useCallback(async () => {
        if (!confirmationProps) return;
    
        const { type } = confirmationProps;
        
        // Close modal immediately
        setConfirmationProps(null);
    
        if (type === 'newImage') {
            logger.info(SOURCE, 'handleConfirm [newImage]: User confirmed. Resetting state.');
            handleReset();
        } else if (type === 'deleteObject') {
            logger.info(SOURCE, 'handleConfirm [deleteObject]: User confirmed.');
            // Use the complete, atomic snapshot from the confirmation data
            const { box, description, image } = confirmationProps.data;
            
            await withLoading(async () => {
                if (!image || !box || !description || !sessionImageDimensions) {
                    throw new Error("Cannot delete object: required state is missing from confirmation data.");
                }

                // Use the snapshotted 'image' for all subsequent operations
                const currentImageDims = await imageUtils.getImageDimensions(image.url);
                const objectImageBase64 = await imageUtils.cropImage(image.url, box);
                
                let fullMaskUrl: string;
                const preciseMaskUrl = await geminiService.createPreciseMask(objectImageBase64, 'image/png', description);
                
                if (preciseMaskUrl) {
                    logger.info(SOURCE, 'AI mask generation successful. Creating full size mask.');
                    const maskAnalysis = await imageUtils.analyzeMask(preciseMaskUrl);
                    if (maskAnalysis.isValid) {
                        logger.info(SOURCE, `DIAGNOSTIC: Mask analysis PASSED. ${maskAnalysis.analysis}`);
                    } else {
                        logger.warn(SOURCE, `DIAGNOSTIC: Mask analysis FAILED. ${maskAnalysis.analysis}`);
                    }
                    fullMaskUrl = await imageUtils.createFullSizeMask(currentImageDims.width, currentImageDims.height, preciseMaskUrl, box);
                } else {
                    logger.warn(SOURCE, 'AI mask generation failed. Falling back to box mask.');
                    fullMaskUrl = await imageUtils.createMaskFromBox(currentImageDims.width, currentImageDims.height, box);
                }
    
                const maskBase64 = imageUtils.getBase64FromDataUrl(fullMaskUrl);
    
                const inpaintedImageUrl = await geminiService.inpaintBackground(
                    imageUtils.getBase64FromDataUrl(image.url),
                    image.mimeType,
                    maskBase64,
                    sessionImageDimensions.width,
                    sessionImageDimensions.height
                );
    
                if (inpaintedImageUrl) {
                    const newMimeType = imageUtils.getMimeTypeFromDataUrl(inpaintedImageUrl);
                    await addHistoryState({ url: inpaintedImageUrl, mimeType: newMimeType });
                    handleClearSelection();
                } else {
                    throw new Error('Inpainting failed to return an image.');
                }
            });
        }
    }, [confirmationProps, handleReset, withLoading, sessionImageDimensions, addHistoryState, handleClearSelection]);
    
    // --- Test Harness Integration ---
    const handleEnterTestMode = useCallback(() => {
        logger.warn(SOURCE, 'Entering Test Mode.');
        setIsTestMode(true);
    }, []);
    const handleExitTestMode = useCallback(() => {
        logger.warn(SOURCE, 'Exiting Test Mode.');
        setIsTestMode(false);
        handleReset();
    }, [handleReset]);
    
    
    // --- Test Handles ---
    useEffect(() => {
        stateRef.current = {
            history,
            historyIndex,
            selectionBox,
            editMode,
            originalObjectDescription,
            prompt,
            error,
            isLoading,
            selectableObjects: [], // Reverted
        };
    });
    
    useEffect(() => {
        handlersRef.current = {
            upload: handleUpload,
            select: handleSelect,
            generate: handleGenerate,
            undo: handleUndo,
            redo: handleRedo,
            reset: handleReset,
        };
    }, [handleUpload, handleSelect, handleGenerate, handleUndo, handleRedo, handleReset]);
    
    const testHandles: AppTestHandles = useMemo(() => ({
        upload: (file) => handlersRef.current.upload(file),
        select: (box) => handlersRef.current.select(box),
        generate: () => handlersRef.current.generate(),
        setPrompt: (newPrompt) => setPrompt(newPrompt),
        undo: () => handlersRef.current.undo(),
        redo: () => handlersRef.current.redo(),
        getState: () => stateRef.current,
        reset: () => handlersRef.current.reset(),
        setLogger: (logFn) => logger.setTestHarnessLogger(logFn),
    }), []);
    
    // --- Log Viewer Handlers ---
    const handleDismissLogs = useCallback(() => {
        logger.info(SOURCE, 'handleDismissLogs: Called.');
        setIsLogViewerVisible(false);
    }, []);

    const handleDownloadLogs = useCallback(() => {
        logger.info(SOURCE, 'handleDownloadLogs: Called.');
        const logText = sessionLogs.join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `banana_peel_logs_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [sessionLogs]);

    const handleOpenApiInspector = useCallback(() => {
        logger.info(SOURCE, 'handleOpenApiInspector: Called.');
        setIsApiInspectorOpen(true);
    }, []);

    const handleCloseApiInspector = useCallback(() => {
        logger.info(SOURCE, 'handleCloseApiInspector: Called.');
        setIsApiInspectorOpen(false);
    }, []);

    // --- Settings Modal Handlers ---
    const handleOpenSettings = useCallback(() => setIsSettingsModalOpen(true), []);
    const handleCloseSettings = useCallback(() => setIsSettingsModalOpen(false), []);
    const handleSaveSettings = useCallback((apiKey: string) => {
        logger.info(SOURCE, 'handleSaveSettings: Saving new API key.');
        apiKeyStore.setApiKey(apiKey);
        setIsSettingsModalOpen(false);
        // Optionally, show a success message
    }, []);

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans flex-col">
            <main className="flex flex-grow overflow-hidden">
                <PromptPanel
                    prompt={prompt}
                    setPrompt={setPrompt}
                    onGenerate={handleGenerate}
                    onUpload={handleUpload}
                    isLoading={isLoading}
                    isProcessingSelection={isProcessingSelection}
                    isRateLimited={isRateLimited}
                    isInEditState={isInEditState}
                    editMode={editMode}
                    onClearSelection={handleClearSelection}
                    objectDescription={originalObjectDescription}
                    onEnterTestMode={handleEnterTestMode}
                    onOpenSettings={handleOpenSettings}
                    promptMode={promptMode}
                    onSetPromptMode={handleSetPromptMode}
                    onDeleteObject={handleRequestDeleteObject}
                />
                <div className="flex-grow flex flex-col p-8">
                    {isInEditState && (
                        <div className="flex-shrink-0 bg-gray-900 border border-gray-700 rounded-t-lg flex items-center justify-between px-4 h-14">
                             <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleUndo}
                                    disabled={!canUndo || isLoading || isProcessingSelection || isSubEditing}
                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Undo"
                                >
                                    <UndoIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={!canRedo || isLoading || isProcessingSelection || isSubEditing}
                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Redo"
                                >
                                    <RedoIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!currentImage) return;
                                        const a = document.createElement('a');
                                        a.href = currentImage.url;
                                        a.download = `banana_peel_${new Date().toISOString()}.png`;
                                        a.click();
                                    }}
                                    disabled={!currentImage || isLoading || isProcessingSelection || isSubEditing}
                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Download Image"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                </button>
                             </div>
                             <button 
                                onClick={handleNewImage}
                                disabled={isLoading || isProcessingSelection || isSubEditing}
                                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md font-semibold disabled:opacity-50 text-yellow-300"
                            >
                                New Image
                            </button>
                        </div>
                    )}
                    <CanvasArea
                        imageUrl={currentImage?.url ?? null}
                        onSelect={handleSelect}
                        isLoading={isLoading}
                        isProcessingSelection={isProcessingSelection}
                        selectionBox={selectionBox}
                    />
                </div>
            </main>
            
            {isLogViewerVisible && !isTestMode && (
                <LogViewer 
                    logs={sessionLogs} 
                    onDismiss={handleDismissLogs} 
                    onDownload={handleDownloadLogs} 
                    onOpenApiInspector={handleOpenApiInspector}
                />
            )}

            {confirmationProps && (
                 <ConfirmationModal
                    isOpen={!!confirmationProps}
                    message={confirmationProps.message}
                    onConfirm={handleConfirm}
                    onCancel={() => setConfirmationProps(null)}
                 />
            )}

            <SettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={handleCloseSettings}
                onSave={handleSaveSettings}
            />

            <ApiCallInspectorModal
                isOpen={isApiInspectorOpen}
                onClose={handleCloseApiInspector}
                history={apiCallHistory}
            />

            {isTestMode && <TestHarness onExit={handleExitTestMode} handles={testHandles} debugImageUrl={debugImageUrl} />}
        </div>
    );
};

export default App;