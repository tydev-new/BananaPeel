import React, { useState, useRef, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon, DownloadIcon } from './icons';

interface LogViewerProps {
  logs: string[];
  onDismiss: () => void;
  onDownload: () => void;
  onOpenApiInspector: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onDismiss, onDownload, onOpenApiInspector }) => {
  const [isOpen, setIsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [logs, isOpen]);
  
  const logText = logs.join('\n');

  if (!isOpen) {
    return (
      <div 
        className="bg-gray-900 border-t border-gray-700 h-8 flex-shrink-0 flex items-center justify-between px-4 cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Open logs"
        aria-expanded="false"
      >
        <span className="text-sm font-medium text-gray-300">Logs</span>
        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
      </div>
    )
  }

  return (
    <div 
      className="bg-gray-800 border-t border-gray-700 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out"
      style={{ height: '40vh' }} // 40% of screen height
    >
      <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
            <button
                onClick={onDismiss}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md font-semibold"
                aria-label="Dismiss and hide log viewer"
            >
                Dismiss
            </button>
            <button
                onClick={onOpenApiInspector}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded-md font-semibold"
                aria-label="Open API Call Inspector"
            >
                API Call Inspector
            </button>
            <button
                onClick={onDownload}
                className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors"
                aria-label="Download logs as a text file"
            >
                <DownloadIcon className="w-4 h-4" />
            </button>
        </div>
        <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 text-gray-400 hover:text-white"
            aria-label="Collapse logs"
            aria-expanded="true"
        >
          <ChevronDownIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-grow overflow-hidden p-2">
        <textarea
            ref={textareaRef}
            value={logText}
            readOnly
            className="w-full h-full bg-gray-900 text-gray-300 font-mono text-xs p-2 rounded-md border-none resize-none focus:ring-0"
            aria-live="polite"
        />
      </div>
    </div>
  );
};

export default LogViewer;