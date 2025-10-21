import React, { useRef, useEffect } from 'react';
import { UploadIcon, LoadingSpinner, SettingsIcon, TrashIcon, ExpandIcon } from './icons';
import { EditMode, PromptMode } from '../types';

interface PromptPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  onUpload: (file: File) => void;
  isLoading: boolean;
  isProcessingSelection: boolean;
  isRateLimited: boolean;
  isInEditState: boolean;
  editMode: EditMode;
  onClearSelection: () => void;
  objectDescription: string | null;
  onEnterTestMode: () => void;
  onOpenSettings: () => void;
  promptMode: PromptMode;
  onSetPromptMode: (mode: PromptMode) => void;
  onDeleteObject: () => void;
  onOpenExpandedEditModal: () => void;
}

const PromptPanel: React.FC<PromptPanelProps> = ({
  prompt,
  setPrompt,
  onGenerate,
  onUpload,
  isLoading,
  isProcessingSelection,
  isRateLimited,
  isInEditState,
  editMode,
  onClearSelection,
  objectDescription,
  onEnterTestMode,
  onOpenSettings,
  promptMode,
  onSetPromptMode,
  onDeleteObject,
  onOpenExpandedEditModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = isLoading || isProcessingSelection || isRateLimited;

  useEffect(() => {
    if ((editMode === 'modify' || editMode === 'add') && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editMode]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };
  
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.trim() === '_run_test_') {
      onEnterTestMode();
      setPrompt(''); // Clear the command after entering test mode
    } else {
      setPrompt(value);
    }
  };

  const getButtonContent = () => {
    if (isRateLimited) {
        return "Rate limit reached. Please wait...";
    }
    if (isLoading || isProcessingSelection) {
      return (
        <>
          <LoadingSpinner className="w-5 h-5 mr-2" />
          {isProcessingSelection ? 'Analyzing...' : 'Processing...'}
        </>
      );
    }
    if (editMode === 'add') return "Add Object";
    if (editMode === 'modify') return "Apply Modification";
    if (isInEditState) return "Edit Image";
    return "Generate Image";
  };
  
  if (editMode === 'pre_add') {
    return (
        <div className="w-96 bg-gray-800 p-6 flex flex-col h-full shadow-lg flex-shrink-0 justify-between">
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-3xl font-bold text-yellow-300">Banana Peel</h1>
                    <button
                        onClick={onOpenSettings}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Open settings"
                    >
                        <SettingsIcon className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-gray-400 mb-6">AI Image Generation & Editing</p>

                <div className="text-center bg-gray-700 p-4 rounded-lg">
                    <p className="font-semibold text-yellow-300">Add New Object</p>
                    <p className="text-sm text-gray-300 mt-2">
                        Use your cursor to draw a box on the canvas, defining the location and size for your new object.
                    </p>
                </div>
            </div>
            <div className="space-y-3 pt-4">
                 <button
                    onClick={onClearSelection}
                    className="w-full py-3 px-4 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                >
                    Cancel Add
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="w-96 bg-gray-800 p-6 flex flex-col h-full shadow-lg flex-shrink-0 overflow-y-auto">
      <div>
        <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-yellow-300">Banana Peel</h1>
            <button
              onClick={onOpenSettings}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Open settings"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
        </div>
        <p className="text-gray-400 mb-6">AI Image Generation & Editing</p>
        
        <div className="flex flex-col space-y-4">
          {editMode === 'modify' && objectDescription && (
            <div className="text-center bg-gray-700 p-2 rounded-lg">
              <p className="text-sm text-gray-400">Modifying object:</p>
              <p className="font-semibold text-yellow-300 capitalize">{objectDescription}</p>
            </div>
          )}
          {editMode === 'add' && (
              <p className="text-sm text-yellow-300 text-center mb-2">No object was found in your selection.</p>
          )}

          {isInEditState && !editMode && (
            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                    Describe your edit
                </label>
                <div className="flex items-center justify-between">
                    <div className="flex items-center bg-gray-700 rounded-md p-1">
                        <button
                            onClick={() => onSetPromptMode('freeform')}
                            disabled={isProcessingSelection}
                            className={`w-24 py-1 text-sm rounded-md transition-colors ${
                                promptMode === 'freeform' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            Freeform
                        </button>
                        <button
                            onClick={() => onSetPromptMode('structured')}
                            disabled={isProcessingSelection}
                            className={`w-24 py-1 text-sm rounded-md transition-colors ${
                                promptMode === 'structured' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            Structured
                        </button>
                    </div>
                    <button 
                      onClick={onOpenExpandedEditModal}
                      disabled={isProcessingSelection}
                      className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Open expanded editor"
                    >
                      <ExpandIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            {editMode === 'modify' && (
              <label htmlFor="prompt" className="text-sm font-medium text-gray-300">
                  Describe your modification
              </label>
            )}
            {editMode === 'modify' && (
              <button 
                onClick={onDeleteObject} 
                className="p-1.5 text-gray-400 hover:text-red-400 rounded-md transition-colors"
                aria-label="Delete selected object"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>


          {(!isInEditState || editMode === 'add') && (
            <label htmlFor="prompt" className="text-sm font-medium text-gray-300">
                {editMode === 'add' ? "Describe object to add to selected area" : "Describe your image"}
            </label>
          )}

          <textarea
            id="prompt"
            ref={textareaRef}
            value={prompt}
            onChange={handlePromptChange}
            placeholder={editMode === 'add' ? "e.g., a beautiful painting on the wall" : editMode === 'modify' ? "e.g., make it wear a party hat" : "e.g., a cat astronaut on the moon"}
            className={`w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition resize-none overflow-y-auto ${
                editMode === 'modify' || editMode === 'add' ? 'h-20' : 'h-40'
            }`}
            disabled={isDisabled}
          />
        </div>
      </div>
      
      <div className="space-y-3 pt-4">
        {editMode ? (
            <>
                <button
                onClick={onGenerate}
                disabled={isDisabled || !prompt}
                className="w-full py-3 px-4 text-sm font-semibold bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                >
                {getButtonContent()}
                </button>
                <button
                onClick={onClearSelection}
                disabled={isDisabled}
                className="w-full py-3 px-4 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors disabled:opacity-50"
                >
                {editMode === 'add' ? "Cancel Add" : "Cancel Modification"}
                </button>
            </>
        ) : (
          <>
            <button
              onClick={onGenerate}
              disabled={isDisabled || !prompt}
              className="w-full py-3 px-4 text-sm font-semibold bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {getButtonContent()}
            </button>
            {!isInEditState && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg"
                  disabled={isDisabled}
                />
                <button
                  onClick={handleUploadClick}
                  disabled={isDisabled}
                  className="w-full flex items-center justify-center py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <UploadIcon className="w-5 h-5 mr-2" />
                  Upload an Image
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PromptPanel;