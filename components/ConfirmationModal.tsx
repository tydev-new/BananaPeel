import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  confirmText: string;
  children: React.ReactNode;
  // Props for the optional 'Force Delete' functionality
  onForceConfirm?: () => void;
  forceConfirmText?: string;
  forceConfirmMessage?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title,
  confirmText,
  children,
  onForceConfirm,
  forceConfirmText,
  forceConfirmMessage,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      onClick={onCancel} // Allow closing by clicking overlay
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirmation-title" className="text-lg font-semibold text-white mb-4">
          {title}
        </h2>
        
        {children}
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold bg-yellow-500 text-gray-900 hover:bg-yellow-400 rounded-md transition-colors"
          >
            {confirmText}
          </button>
        </div>
        
        {onForceConfirm && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-3">
              {forceConfirmMessage || "Some objects with unclear boundaries are hard to delete. Force delete removes everything in the selection box."}
            </p>
            <div className="flex justify-end">
                <button
                    onClick={onForceConfirm}
                    className="px-4 py-2 text-sm font-semibold bg-red-800 text-white hover:bg-red-700 rounded-md transition-colors"
                >
                    {forceConfirmText}
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmationModal;