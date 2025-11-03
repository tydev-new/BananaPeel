import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  errorMessage: string;
  onCancel: () => void;
  onUpdateApiKey: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  errorMessage,
  onCancel,
  onUpdateApiKey,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-title"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-red-500"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="error-title" className="text-lg font-semibold text-red-400 mb-4">
          An Error Occurred
        </h2>
        
        <p className="text-sm text-gray-300 bg-gray-900 p-3 rounded-md font-mono whitespace-pre-wrap">
          {errorMessage}
        </p>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onUpdateApiKey}
            className="px-4 py-2 text-sm font-semibold bg-yellow-500 text-gray-900 hover:bg-yellow-400 rounded-md transition-colors"
          >
            Update API Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;