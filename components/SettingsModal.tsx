import React, { useState, useEffect } from 'react';

const MAX_FREE_USES = 6;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  isSessionKeySet: boolean;
  usageCount: number;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, isSessionKeySet, usageCount }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(''); // Always clear the input field when opening
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };
  
  const remainingUses = Math.max(0, MAX_FREE_USES - usageCount);

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="text-lg font-semibold text-white mb-4">
          Enter Your Gemini API Key
        </h2>
        
        {!isSessionKeySet && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg text-center">
                <p className="text-sm text-gray-300">
                    You have <span className="font-bold text-yellow-300">{remainingUses} of {MAX_FREE_USES}</span> free uses remaining.
                </p>
            </div>
        )}

        <p className="text-gray-400 mb-4 text-sm">
          Your Gemini API key is only used for this session. It is never saved nor sent to any servers.
        </p>

        <div className="text-gray-400 mb-4 text-sm space-y-2">
            <p>
              Get your FREE key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
                the official Google AI Studio website
              </a>.
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Log in with your Google account.</li>
                <li>Click "Get API key" on left panel.</li>
                <li>If needed, click "Create API key" at upper right corner.</li>
                <li>Copy the key and paste it below.</li>
            </ol>
        </div>

        <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-1">
          Enter your Gemini API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={isSessionKeySet ? '••••••••••••••••••••••••••' : 'gm-...'}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
        />
        {isSessionKeySet && <p className="text-xs text-gray-500 mt-1">A key is already set for this session. Entering a new key will overwrite it.</p>}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="px-4 py-2 text-sm font-semibold bg-yellow-500 text-gray-900 hover:bg-yellow-400 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;