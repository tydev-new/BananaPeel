import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import CanvasArea from './components/CanvasArea';
import PromptPanel from './components/PromptPanel';
import TestHarness from './components/TestHarness';
import LogViewer from './components/LogViewer';
import ConfirmationModal from './components/ConfirmationModal';
import SettingsModal from './components/SettingsModal';
import ApiCallInspectorModal from './components/ApiCallInspectorModal';
import ExpandedEditModal from './components/ExpandedEditModal';
import ErrorModal from './components/ErrorModal';
import { BoundingBox, ApiCallRecord, EditMode, PromptMode, HistoryState } from './types';
import * as geminiService from './services/geminiService';
import * as imageUtils from './utils/imageUtils';
import * as usageTracker from './utils/usageTracker';
import * as apiCallHistoryStore from './utils/apiCallHistory';
import { AppState, AppTestHandles } from './test/types';
import { logger, LogLevel } from './utils/logger';
import { DownloadIcon, PlusIcon, RedoIcon, UndoIcon } from './components/icons';

type DeleteActionData = {
    box: BoundingBox;
    description: string;
    image: {
        url: string;
        mimeType: string;
    };
};

type ConfirmationAction =
    | { type: 'newImage' }
    | { type: 'deleteObject'; data: DeleteActionData };


type AppHandlers = Omit<AppTestHandles, 'getState' | 'setPrompt' | 'setLogger'>;

const SOURCE = 'App';

const App: React.FC = () => {
    // History state
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    // UI/Loading state
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessingSelection, setIsProcessingSelection] = useState<boolean>(false);
    const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);
    const [isExpandedEditModalOpen, setIsExpandedEditModalOpen] = useState(false);

    // API Key & Usage State
    const [sessionApiKey, setSessionApiKey] = useState<string | null>(null);
    const [usageCount, setUsageCount] = useState<number>(0);

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

    // --- Derived State ---
    const currentImage = useMemo(() => {
        if (historyIndex >= 0 && historyIndex < history.length) {
            return history[historyIndex];
        }
        return null;
    }, [history, historyIndex]);

    const isInEditState = !!currentImage;
    const isSubEditing = useMemo(() => editMode === 'modify' || editMode === 'add' || editMode === 'pre_add', [editMode]);

    const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
    const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history]);

    // Fix: Add an explicit return type to `getApiKeyInfo`.
    // This prevents TypeScript from widening the literal type of `type` to a generic `string`.
    // By specifying the return type, we ensure `apiKeyInfo.type` is correctly typed as `'user' | 'default'`,
    // which matches the `ApiKeyType` expected by the `geminiService` functions.
    const getApiKeyInfo = useCallback((): { key: string; type: 'user' | 'default' } => {
        const key = sessionApiKey || process.env.API_KEY || '';
        const type = sessionApiKey ? 'user' : 'default';
        return { key, type };
    }, [sessionApiKey]);


    // --- Effects ---
    useEffect(() => {
        logger.setLevel(LogLevel.INFO);
        const logCollector = (message: string) => {
            setSessionLogs(prev => [...prev, message]);
        };
        logger.addOutput(logCollector);

        // Load initial usage count from persistent storage
        setUsageCount(usageTracker.getUsageCount());

        const unsubscribe = apiCallHistoryStore.subscribe(setApiCallHistory);

        return () => {
            logger.removeOutput(logCollector);
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (historyIndex !== -1) {
            logger.info(SOURCE, `useEffect[historyIndex]: History changed to index ${historyIndex}. Resetting prompt mode and clearing prompt.`);
            setPromptMode('freeform');
            setPrompt('');
            setOriginalStructuredPrompt(null);
        }
    }, [historyIndex]);
    
    const updateUsageCountIfNeeded = useCallback(() => {
        if (getApiKeyInfo().type === 'default') {
            setUsageCount(usageTracker.getUsageCount());
        }
    }, [getApiKeyInfo]);

    // --- History Management ---
    const addHistoryState = useCallback(async (newImage: { url: string; mimeType: string }) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const newHistoryItem: HistoryState = { ...newImage, structuredDescription: null };
        newHistory.push(newHistoryItem);
        logger.info(SOURCE, `STATE: Adding to history. New length: ${newHistory.length}, new index: ${newHistory.length - 1}.`);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        if (newHistory.length === 1) {
            logger.info(SOURCE, 'Setting new session image dimensions from generated image.');
            const dims = await imageUtils.getImageDimensions(newImage.url);
            setSessionImageDimensions(dims);
            logger.info(SOURCE, `Session dimensions SET to: { width: ${dims.width}, height: ${dims.height} }`);
        }
    }, [history, historyIndex]);

    const handleHistoryNavigation = useCallback((direction: 'undo' | 'redo') => {
        const canNavigate = direction === 'undo' ? canUndo : canRedo;
        if (!canNavigate) {
            logger.warn(SOURCE, `handleHistoryNavigation: Cannot perform ${direction}.`);
            return;
        }

        const change = direction === 'undo' ? -1 : 1;
        const newIndex = historyIndex + change;
        logger.info(SOURCE, `handleHistoryNavigation: Called. Direction: ${direction}. Index from ${historyIndex} to ${newIndex}.`);
        setHistoryIndex(newIndex);
    }, [canUndo, canRedo, historyIndex]);

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
        setSessionLogs([]);
        setSessionImageDimensions(null);
        setPromptMode('freeform');
        setOriginalStructuredPrompt(null);
    }, []);

    const handleNewImage = useCallback(() => {
        logger.info(SOURCE, 'handleNewImage: Called.');
        setConfirmationAction({ type: 'newImage' });
    }, []);
    

    // --- Core Image Operations ---

    const handleGenerate = async () => {
        if (!prompt || isLoading || isProcessingSelection) return;

        setIsLoading(true);
        setError(null);
        const apiKeyInfo = getApiKeyInfo();

        try {
            if (editMode === 'modify' && selectionBox && currentImage && sessionImageDimensions && originalObjectDescription) {
                 logger.info(SOURCE, `USER_INTENT [Modify Object]: "${prompt}"`);
                 const originalImageBase64 = imageUtils.getBase64FromDataUrl(currentImage.url);

                 const boxMask = await imageUtils.createMaskFromBox(sessionImageDimensions.width, sessionImageDimensions.height, selectionBox);
                 const boxMaskBase64 = imageUtils.getBase64FromDataUrl(boxMask);

                 const inpaintedDataUrl = await geminiService.inpaintBackground(
                     apiKeyInfo.key, apiKeyInfo.type, originalImageBase64, currentImage.mimeType, boxMaskBase64,
                     sessionImageDimensions.width, sessionImageDimensions.height, originalObjectDescription
                 );
                 const inpaintedBase64 = imageUtils.getBase64FromDataUrl(inpaintedDataUrl);
                 const inpaintedMimeType = imageUtils.getMimeTypeFromDataUrl(inpaintedDataUrl);

                 const croppedObjectBase64 = await imageUtils.cropImage(currentImage.url, selectionBox);
                 const preprocessed = await geminiService.preprocessUserPrompt(apiKeyInfo.key, apiKeyInfo.type, prompt);

                 const finalDataUrl = await geminiService.addModifiedObject(
                     apiKeyInfo.key, apiKeyInfo.type, inpaintedBase64, inpaintedMimeType, croppedObjectBase64,
                     boxMaskBase64, preprocessed, sessionImageDimensions.width, sessionImageDimensions.height
                 );
                 await addHistoryState({ url: finalDataUrl, mimeType: imageUtils.getMimeTypeFromDataUrl(finalDataUrl) });

            } else if (editMode === 'add' && selectionBox && currentImage && sessionImageDimensions) {
                logger.info(SOURCE, `USER_INTENT [Add Object]: "${prompt}"`);
                const imageBase64 = imageUtils.getBase64FromDataUrl(currentImage.url);
                const mask = await imageUtils.createMaskFromBox(sessionImageDimensions.width, sessionImageDimensions.height, selectionBox);
                const maskBase64 = imageUtils.getBase64FromDataUrl(mask);
                const newDataUrl = await geminiService.addObjectToImage(
                    apiKeyInfo.key, apiKeyInfo.type, imageBase64, currentImage.mimeType, maskBase64,
                    prompt, sessionImageDimensions.width, sessionImageDimensions.height
                );
                await addHistoryState({ url: newDataUrl, mimeType: imageUtils.getMimeTypeFromDataUrl(newDataUrl) });

            } else if (isInEditState && currentImage && sessionImageDimensions) {
                if (promptMode === 'structured' && originalStructuredPrompt) {
                     logger.info(SOURCE, `USER_INTENT [Structured Edit]: ${prompt}`);
                     const imageBase64 = imageUtils.getBase64FromDataUrl(currentImage.url);
                     const newDataUrl = await geminiService.editImageWithStructuredPrompt(
                         apiKeyInfo.key, apiKeyInfo.type, originalStructuredPrompt, prompt, imageBase64,
                         currentImage.mimeType, sessionImageDimensions.width, sessionImageDimensions.height
                     );
                     await addHistoryState({ url: newDataUrl, mimeType: imageUtils.getMimeTypeFromDataUrl(newDataUrl) });
                } else {
                    logger.info(SOURCE, `USER_INTENT [Global Edit]: "${prompt}"`);
                    const imageBase64 = imageUtils.getBase64FromDataUrl(currentImage.url);
                    const newDataUrl = await geminiService.editImage(
                        apiKeyInfo.key, apiKeyInfo.type, prompt, imageBase64, currentImage.mimeType,
                        sessionImageDimensions.width, sessionImageDimensions.height
                    );
                    await addHistoryState({ url: newDataUrl, mimeType: imageUtils.getMimeTypeFromDataUrl(newDataUrl) });
                }
            } else {
                logger.info(SOURCE, `USER_INTENT [New Image]: "${prompt}"`);
                const newDataUrl = await geminiService.generateImage(apiKeyInfo.key, apiKeyInfo.type, prompt);
                await addHistoryState({ url: newDataUrl, mimeType: imageUtils.getMimeTypeFromDataUrl(newDataUrl) });
            }
            updateUsageCountIfNeeded();
        } catch (e) {
            const error = e as Error;
            logger.error(SOURCE, `handleGenerate: An error occurred: ${error.message}`);
            setError(error.message);
        } finally {
            setIsLoading(false);
            setPrompt('');
            setSelectionBox(null);
            setEditMode(null);
            setOriginalObjectDescription(null);
            setPromptMode('freeform');
            setOriginalStructuredPrompt(null);
        }
    };

    const handleUpload = async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUtils.fileToBase64(file);
            const dataUrl = `data:${mimeType};base64,${base64}`;
            logger.info(SOURCE, 'Setting new session image dimensions from uploaded image.');
            const dims = await imageUtils.getImageDimensions(dataUrl);
            setSessionImageDimensions(dims);
            logger.info(SOURCE, `Session dimensions SET to: { width: ${dims.width}, height: ${dims.height} }`);
            
            setHistory([]);
            setHistoryIndex(-1);
            
            await addHistoryState({ url: dataUrl, mimeType });

        } catch (e) {
            const error = e as Error;
            logger.error(SOURCE, `handleUpload: An error occurred: ${error.message}`);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Selection & Editing Workflow ---

    const handleSelect = useCallback(async (box: BoundingBox) => {
        if (!currentImage || isProcessingSelection) return;

        if (editMode === 'pre_add') {
             logger.info(SOURCE, `handleSelect: Transitioning from 'pre_add' to 'add' mode.`);
             setSelectionBox(box);
             setEditMode('add');
             setOriginalObjectDescription(null);
             return;
        }

        setIsProcessingSelection(true);
        setSelectionBox(box);
        setError(null);
        const apiKeyInfo = getApiKeyInfo();

        try {
            const { url, mimeType } = currentImage;
            const croppedImageBase64 = await imageUtils.cropImage(url, box);
            setDebugImageUrl(`data:image/png;base64,${croppedImageBase64}`);

            const description = await geminiService.describeObject(apiKeyInfo.key, apiKeyInfo.type, croppedImageBase64, 'image/png');
            updateUsageCountIfNeeded();
            
            if (description.toLowerCase().includes('background')) {
                logger.info(SOURCE, 'handleSelect: Selected area identified as "background". Entering ADD mode.');
                setEditMode('add');
                setOriginalObjectDescription(null);
            } else {
                logger.info(SOURCE, `handleSelect: Selected area identified as "${description}". Entering MODIFY mode.`);
                setEditMode('modify');
                setOriginalObjectDescription(description);
            }
        } catch (e) {
            const error = e as Error;
            logger.error(SOURCE, `handleSelect: An error occurred: ${error.message}`);
            setError(error.message);
            setSelectionBox(null);
            setEditMode(null);
        } finally {
            setIsProcessingSelection(false);
        }
    }, [currentImage, isProcessingSelection, editMode, getApiKeyInfo, updateUsageCountIfNeeded]);

    const handleClearSelection = useCallback(() => {
        logger.info(SOURCE, 'handleClearSelection: Called.');
        setSelectionBox(null);
        setEditMode(null);
        setOriginalObjectDescription(null);
        setPrompt('');
    }, []);

    const handleRequestDeleteObject = useCallback(() => {
        logger.info(SOURCE, 'handleRequestDeleteObject: Called.');
        if (selectionBox && originalObjectDescription && currentImage) {
            const deleteData: DeleteActionData = {
                box: selectionBox,
                description: originalObjectDescription,
                image: { url: currentImage.url, mimeType: currentImage.mimeType }
            };
            setConfirmationAction({ type: 'deleteObject', data: deleteData });
        } else {
            logger.error(SOURCE, 'handleRequestDeleteObject: Could not request delete, missing required data.');
        }
    }, [selectionBox, originalObjectDescription, currentImage]);

    const handleRequestAddObject = useCallback(() => {
        logger.info(SOURCE, 'handleRequestAddObject: Called.');
        setEditMode('pre_add');
        setSelectionBox(null);
        setOriginalObjectDescription(null);
    }, []);

    // --- Modal & Confirmation Logic ---

    const handleConfirm = useCallback(async () => {
        if (!confirmationAction) return;

        const actionToProcess = confirmationAction;
        setConfirmationAction(null);

        const actionType = actionToProcess.type;
        logger.info(SOURCE, `handleConfirm: User confirmed action: ${actionType}`);

        if (actionType === 'newImage') {
            handleReset();
        } else if (actionType === 'deleteObject') {
            const { box, description, image } = actionToProcess.data;
            setIsLoading(true);
            setError(null);
            const apiKeyInfo = getApiKeyInfo();
            try {
                if (!sessionImageDimensions) {
                    throw new Error("Cannot delete, session image dimensions are not set.");
                }
                const originalImageBase64 = imageUtils.getBase64FromDataUrl(image.url);
                 logger.debug(SOURCE, `DELETE: Selection box for operation: ${JSON.stringify(box)}`);

                logger.info(SOURCE, 'DELETE: Step 1 - Creating precise mask...');
                const croppedObjectBase64 = await imageUtils.cropImage(image.url, box);
                const preciseCroppedMaskBase64 = await geminiService.createPreciseMask(apiKeyInfo.key, apiKeyInfo.type, croppedObjectBase64, description);
                updateUsageCountIfNeeded();

                logger.info(SOURCE, 'DELETE: Step 1.5 - Binarizing mask to remove gray pixels...');
                const binarizedMaskBase64 = await imageUtils.binarizeMask(preciseCroppedMaskBase64);
                
                logger.info(SOURCE, 'DELETE: Step 2 - Validating cleaned mask...');
                const { isValid, analysis } = await imageUtils.analyzeMask(`data:image/png;base64,${binarizedMaskBase64}`);
                let finalGlobalMaskBase64: string;

                if (isValid) {
                    logger.info(SOURCE, `DELETE: Mask validation PASSED. ${analysis}`);
                    logger.info(SOURCE, 'DELETE: Step 2a - Scaling mask to selection box dimensions...');
                    const scaledMaskBase64 = await imageUtils.scaleImage(binarizedMaskBase64, box.width, box.height);
                    setDebugImageUrl(`data:image/png;base64,${scaledMaskBase64}`);

                    logger.info(SOURCE, 'DELETE: Step 2b - Compositing scaled mask into final global mask...');
                    const compositeMaskDataUrl = await imageUtils.compositeMask(
                        sessionImageDimensions.width, sessionImageDimensions.height, scaledMaskBase64, box
                    );
                    finalGlobalMaskBase64 = imageUtils.getBase64FromDataUrl(compositeMaskDataUrl);
                } else {
                    logger.warn(SOURCE, `DELETE: Mask validation FAILED. ${analysis}. Falling back to simple box mask.`);
                    const boxMaskDataUrl = await imageUtils.createMaskFromBox(sessionImageDimensions.width, sessionImageDimensions.height, box);
                    finalGlobalMaskBase64 = imageUtils.getBase64FromDataUrl(boxMaskDataUrl);
                }
                
                logger.info(SOURCE, 'DELETE: Step 3 - Inpainting background with final mask...');
                const newDataUrl = await geminiService.inpaintBackground(
                    apiKeyInfo.key, apiKeyInfo.type, originalImageBase64, image.mimeType, finalGlobalMaskBase64,
                    sessionImageDimensions.width, sessionImageDimensions.height, description
                );
                updateUsageCountIfNeeded();

                await addHistoryState({ url: newDataUrl, mimeType: imageUtils.getMimeTypeFromDataUrl(newDataUrl) });

            } catch (e) {
                const error = e as Error;
                logger.error(SOURCE, `handleConfirm (delete): An error occurred: ${error.message}`);
                setError(error.message);
            } finally {
                setIsLoading(false);
                setSelectionBox(null);
                setEditMode(null);
                setOriginalObjectDescription(null);
            }
        }
    }, [confirmationAction, handleReset, sessionImageDimensions, addHistoryState, getApiKeyInfo, updateUsageCountIfNeeded]);

    const handleCancel = useCallback(() => {
        logger.info(SOURCE, 'handleCancel: User cancelled action.');
        setConfirmationAction(null);
    }, []);
    
    // --- Settings & Error Logic ---
    
    const handleSaveApiKey = (key: string) => {
        logger.info(SOURCE, 'handleSaveApiKey: Called.');
        setSessionApiKey(key);
        setIsSettingsModalOpen(false);
        setError(null);
    };

    const handleRequestUpdateApiKey = useCallback(() => {
        logger.info(SOURCE, 'handleRequestUpdateApiKey: User requested to update API key from error modal.');
        setError(null);
        setIsSettingsModalOpen(true);
    }, []);
    
    // --- Structured Edit Logic ---
    
    const handleSetPromptMode = useCallback(async (mode: PromptMode) => {
        logger.info(SOURCE, `handleSetPromptMode: Called with mode: ${mode}.`);
        setPromptMode(mode);
        setPrompt('');
        
        if (mode === 'structured' && currentImage) {
            if (currentImage.structuredDescription) {
                 logger.info(SOURCE, 'handleSetPromptMode: Found cached structured prompt. Using it.');
                 setOriginalStructuredPrompt(currentImage.structuredDescription);
                 setPrompt(currentImage.structuredDescription);
                 return;
            }

            setIsProcessingSelection(true);
            setError(null);
            const apiKeyInfo = getApiKeyInfo();
            try {
                const imageBase64 = imageUtils.getBase64FromDataUrl(currentImage.url);
                const description = await geminiService.describeImageInDetail(apiKeyInfo.key, apiKeyInfo.type, imageBase64, currentImage.mimeType);
                updateUsageCountIfNeeded();
                setOriginalStructuredPrompt(description);
                setPrompt(description);
                
                setHistory(prevHistory => {
                    const newHistory = [...prevHistory];
                    const currentItem = newHistory[historyIndex];
                    if (currentItem) {
                        newHistory[historyIndex] = { ...currentItem, structuredDescription: description };
                    }
                    return newHistory;
                });

            } catch(e) {
                const error = e as Error;
                logger.error(SOURCE, `handleSetPromptMode: Failed to generate structured prompt: ${error.message}`);
                setError('Failed to generate structured description.');
                setPromptMode('freeform');
            } finally {
                setIsProcessingSelection(false);
            }
        } else if (mode === 'freeform') {
            setOriginalStructuredPrompt(null);
        }
    }, [currentImage, historyIndex, getApiKeyInfo, updateUsageCountIfNeeded]);
    
    const handleDownload = () => {
        if (currentImage) {
            const a = document.createElement('a');
            a.href = currentImage.url;
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
            const fileExtension = currentImage.mimeType.split('/')[1] || 'png';
            a.download = `banana_peel_${timestamp}.${fileExtension}`;
            document.body.appendChild(a);
a.click();
            document.body.removeChild(a);
        }
    };
    
    const handleDownloadLogs = () => {
        const blob = new Blob([sessionLogs.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        a.download = `banana_peel_logs_${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    // --- Test Harness Integration ---
    const handleEnterTestMode = () => {
        setIsTestMode(true);
        logger.setTestHarnessLogger((message: string) => {});
    };
    
    const handleExitTestMode = () => {
        setIsTestMode(false);
        logger.setTestHarnessLogger(null);
        handleReset();
    };

    useEffect(() => {
        stateRef.current = {
            history, historyIndex, selectionBox, editMode, originalObjectDescription,
            prompt, error, isLoading,
        };
    }, [history, historyIndex, selectionBox, editMode, originalObjectDescription, prompt, error, isLoading]);

    useEffect(() => {
        handlersRef.current = {
            upload: handleUpload, select: handleSelect, generate: handleGenerate,
            undo: () => handleHistoryNavigation('undo'), redo: () => handleHistoryNavigation('redo'),
            reset: handleReset,
        };
    }, [handleUpload, handleSelect, handleGenerate, handleHistoryNavigation, handleReset]);

    const testHandles = useMemo<AppTestHandles>(() => ({
        ...handlersRef.current,
        getState: () => stateRef.current,
        setPrompt: setPrompt,
        setLogger: (logFn) => logger.setTestHarnessLogger(logFn),
    }), []);
    
    const showLogViewer = isLogViewerVisible && !isTestMode;

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <PromptPanel
                prompt={prompt} setPrompt={setPrompt} onGenerate={handleGenerate} onUpload={handleUpload}
                isLoading={isLoading} isProcessingSelection={isProcessingSelection} isRateLimited={isRateLimited}
                isInEditState={isInEditState} editMode={editMode} onClearSelection={handleClearSelection}
                objectDescription={originalObjectDescription} onEnterTestMode={handleEnterTestMode}
                onOpenSettings={() => setIsSettingsModalOpen(true)} promptMode={promptMode}
                onSetPromptMode={handleSetPromptMode} onDeleteObject={handleRequestDeleteObject}
                onOpenExpandedEditModal={() => setIsExpandedEditModalOpen(true)}
            />
            <div className="flex-grow flex flex-col">
                {isInEditState && (
                    <div className="bg-gray-800 h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-gray-700 shadow-md">
                        <div className="flex items-center space-x-2">
                             <button
                                onClick={() => handleHistoryNavigation('undo')}
                                disabled={!canUndo || isSubEditing || isLoading}
                                className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Undo last action"
                            >
                                <UndoIcon className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => handleHistoryNavigation('redo')}
                                disabled={!canRedo || isSubEditing || isLoading}
                                className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Redo last action"
                            >
                                <RedoIcon className="w-6 h-6" />
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={isSubEditing || isLoading}
                                className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Download current image"
                            >
                                <DownloadIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex items-center space-x-2">
                             <button
                                onClick={handleRequestAddObject}
                                disabled={isSubEditing || isLoading}
                                className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Add a new object"
                            >
                                <PlusIcon className="w-6 h-6" />
                            </button>
                            <button
                                onClick={handleNewImage}
                                disabled={isSubEditing || isLoading}
                                className="px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                New Image
                            </button>
                        </div>
                    </div>
                )}
                <CanvasArea
                    imageUrl={currentImage?.url ?? null} onSelect={handleSelect} isLoading={isLoading}
                    isProcessingSelection={isProcessingSelection} selectionBox={selectionBox} editMode={editMode}
                />
            </div>
            {showLogViewer && (
                <div className="absolute bottom-0 left-0 right-0 z-10">
                    <LogViewer
                        logs={sessionLogs} onDismiss={() => setIsLogViewerVisible(false)} onDownload={handleDownloadLogs}
                        onOpenApiInspector={() => setIsApiInspectorOpen(true)}
                    />
                </div>
            )}
            
            {confirmationAction && (
                <ConfirmationModal
                    isOpen={!!confirmationAction} onConfirm={handleConfirm} onCancel={handleCancel}
                    title={confirmationAction.type === 'newImage' ? 'Start a New Image?' : 'Please confirm delete'}
                    confirmText={confirmationAction.type === 'newImage' ? 'Confirm' : 'Delete'}
                >
                    {confirmationAction.type === 'newImage' && (
                        <p className="text-sm text-gray-400">
                            Your current image and history will be lost. This action cannot be undone.
                        </p>
                    )}
                    {confirmationAction.type === 'deleteObject' && (
                        <p className="text-sm text-gray-400">
                            The selected object will be removed.
                        </p>
                    )}
                </ConfirmationModal>
            )}

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                onSave={handleSaveApiKey}
                isSessionKeySet={!!sessionApiKey}
                usageCount={usageCount}
            />

            <ErrorModal
                isOpen={!!error} errorMessage={error || ''} onCancel={() => setError(null)}
                onUpdateApiKey={handleRequestUpdateApiKey}
            />

            <ApiCallInspectorModal
                isOpen={isApiInspectorOpen} onClose={() => setIsApiInspectorOpen(false)}
                history={apiCallHistory}
            />
            
            <ExpandedEditModal
                isOpen={isExpandedEditModalOpen} onClose={() => setIsExpandedEditModalOpen(false)}
                prompt={prompt} setPrompt={setPrompt} onGenerate={handleGenerate} isLoading={isLoading}
                isProcessingSelection={isProcessingSelection} isRateLimited={isRateLimited}
                promptMode={promptMode} onSetPromptMode={handleSetPromptMode}
            />

            {isTestMode && (
                <TestHarness onExit={handleExitTestMode} handles={testHandles} debugImageUrl={debugImageUrl} />
            )}
        </div>
    );
};

export default App;
