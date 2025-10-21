import React from 'react';
import { PromptMode } from '../types';
import { LoadingSpinner, CollapseIcon } from './icons';

interface ExpandedEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  isProcessingSelection: boolean;
  isRateLimited: boolean;
  promptMode: PromptMode;
  onSetPromptMode: (mode: PromptMode) => void;
}

const ExpandedEditModal: React.FC<ExpandedEditModalProps> = ({
  isOpen,
  onClose,
  prompt,
  setPrompt,
  onGenerate,
  isLoading,
  isProcessingSelection,
  isRateLimited,
  promptMode,
  onSetPromptMode,
}) => {
  if (!isOpen) {
    return null;
  }

  const isDisabled = isLoading || isProcessingSelection || isRateLimited;

  const handleGenerateClick = () => {
    onGenerate();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expanded-edit-title"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-[90%] max-w-7xl h-full max-h-[90vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 id="expanded-edit-title" className="text-lg font-semibold text-white">
            Expanded Editor
          </h2>
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-700 rounded-md p-1 w-48">
              <button
                onClick={() => onSetPromptMode('freeform')}
                disabled={isProcessingSelection}
                className={`w-1/2 py-1 text-sm rounded-md transition-colors ${
                  promptMode === 'freeform' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Freeform
              </button>
              <button
                onClick={() => onSetPromptMode('structured')}
                disabled={isProcessingSelection}
                className={`w-1/2 py-1 text-sm rounded-md transition-colors ${
                  promptMode === 'structured' ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Structured
              </button>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessingSelection}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Collapse editor"
            >
              <CollapseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-grow p-4 overflow-hidden flex flex-col">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your edit..."
            className="w-full h-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition resize-none font-mono text-sm"
            disabled={isDisabled}
            autoFocus
          />
        </div>
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={handleGenerateClick}
            disabled={isDisabled || !prompt}
            className="w-full py-3 px-4 text-sm font-semibold bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading || isProcessingSelection ? (
              <>
                <LoadingSpinner className="w-5 h-5 mr-2" />
                {isProcessingSelection ? 'Analyzing...' : 'Processing...'}
              </>
            ) : (
              "Edit Image"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpandedEditModal;