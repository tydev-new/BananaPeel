import React, { useState, useEffect } from 'react';
import { hasApiKey } from '../utils/apiKeyStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [keyIsSet, setKeyIsSet] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyIsSet(hasApiKey());
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
        <p className="text-gray-400 mb-4 text-sm">
          Your Gemini API key is stored securely in your browser's local storage and is never sent to our servers.
        </p>

        <div className="text-gray-400 mb-4 text-sm space-y-2">
            <p>
              Get your FREE key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
                Google AI Studio
              </a>.
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Log in with your Google account.</li>
                <li>Click "Get API key".</li>
                <li>Click "Create API key".</li>
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
          placeholder={keyIsSet ? '••••••••••••••••••••••••••' : 'gm-...'}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
        />
        {keyIsSet && <p className="text-xs text-gray-500 mt-1">A key is already saved. Entering a new key will overwrite it.</p>}

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