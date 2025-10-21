import React, { useState } from 'react';
import { ApiCallRecord } from '../types';
import { DownloadIcon } from './icons';

interface ApiCallInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ApiCallRecord[];
}

const ApiCallInspectorModal: React.FC<ApiCallInspectorModalProps> = ({ isOpen, onClose, history }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) {
    return null;
  }

  const selectedCall = history.length > selectedIndex ? history[selectedIndex] : null;

  const handleDownload = (imageUrl: string, functionName: string, type: string, index: number) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `api_inspector_${functionName}_${type}_${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-inspector-title"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 id="api-inspector-title" className="text-xl font-bold text-yellow-300">API Call Inspector</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-semibold"
          >
            Close
          </button>
        </div>
        <div className="flex flex-grow overflow-hidden">
          <div className="w-1/4 border-r border-gray-700 p-4 overflow-y-auto flex-shrink-0">
            <h3 className="font-semibold mb-2 text-gray-300">Recent Calls</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No API calls recorded yet.</p>
            ) : (
              <ul>
                {history.map((call, index) => (
                  <li key={call.id} className="mb-1">
                    <button
                      onClick={() => setSelectedIndex(index)}
                      className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                        selectedIndex === index
                          ? 'bg-yellow-500 text-gray-900 font-semibold'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span className="font-medium">{call.functionName}</span>
                      <span className="block text-xs opacity-70">{call.timestamp}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-3/4 p-4 overflow-y-auto">
            {selectedCall ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{selectedCall.functionName}</h3>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-300 mb-2">Text Prompt</h4>
                  <pre className="bg-gray-900 p-3 rounded-md text-xs text-gray-300 whitespace-pre-wrap font-mono">{selectedCall.prompt || 'No text prompt provided.'}</pre>
                </div>

                {selectedCall.outputText && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-300 mb-2">Text Output</h4>
                    <pre className="bg-gray-900 p-3 rounded-md text-xs text-gray-300 whitespace-pre-wrap font-mono">{selectedCall.outputText}</pre>
                  </div>
                )}
                
                {selectedCall.inputImages.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-300 mb-2">Input Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedCall.inputImages.map((img, index) => (
                        <div key={index} className="bg-gray-900 p-2 rounded-md border border-gray-700 text-center">
                          <p className="text-xs text-gray-400 mb-2">{img.label}</p>
                          <img src={img.url} alt={img.label} className="w-full h-auto object-contain mb-2 bg-black/20" />
                          <button onClick={() => handleDownload(img.url, selectedCall.functionName, `input_${img.label.replace(/\s+/g, '_')}`, index)} className="text-xs text-yellow-400 hover:underline flex items-center justify-center w-full">
                            <DownloadIcon className="w-3 h-3 mr-1" /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedCall.outputImages.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-300 mb-2">Output Images</h4>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedCall.outputImages.map((img, index) => (
                        <div key={index} className="bg-gray-900 p-2 rounded-md border border-gray-700 text-center">
                          <p className="text-xs text-gray-400 mb-2">{img.label}</p>
                          <img src={img.url} alt={img.label} className="w-full h-auto object-contain mb-2 bg-black/20" />
                          <button onClick={() => handleDownload(img.url, selectedCall.functionName, `output_${img.label.replace(/\s+/g, '_')}`, index)} className="text-xs text-yellow-400 hover:underline flex items-center justify-center w-full">
                            <DownloadIcon className="w-3 h-3 mr-1" /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select an API call from the left to see details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiCallInspectorModal;