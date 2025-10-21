import React, { useState, useRef, useEffect } from 'react';
import { BoundingBox, ImagePositionInfo, EditMode } from '../types';
import { LoadingSpinner } from './icons';

// type EditMode = 'modify' | 'add' | 'pre_add' | null;

interface CanvasAreaProps {
  imageUrl: string | null;
  onSelect: (box: BoundingBox) => void;
  isLoading: boolean;
  isProcessingSelection: boolean;
  selectionBox: BoundingBox | null;
  editMode: EditMode;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  imageUrl,
  onSelect,
  isLoading,
  isProcessingSelection,
  selectionBox,
  editMode,
}) => {
  const [dragSelection, setDragSelection] = useState<BoundingBox | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imagePosition, setImagePosition] = useState<ImagePositionInfo | null>(null);

  useEffect(() => {
    const imageEl = imageRef.current;
    const containerEl = canvasRef.current;

    if (!containerEl) return;

    const calculatePosition = () => {
        if (!imageEl || !imageEl.complete || imageEl.naturalWidth === 0) {
            setImagePosition(null);
            return;
        }

        const naturalWidth = imageEl.naturalWidth;
        const naturalHeight = imageEl.naturalHeight;
        const containerWidth = containerEl.clientWidth;
        const containerHeight = containerEl.clientHeight;

        const scale = Math.min(
            containerWidth / naturalWidth,
            containerHeight / naturalHeight
        );
        const renderedWidth = naturalWidth * scale;
        const renderedHeight = naturalHeight * scale;
        const offsetX = (containerWidth - renderedWidth) / 2;
        const offsetY = (containerHeight - renderedHeight) / 2;

        setImagePosition({ scale, offsetX, offsetY, renderedWidth, renderedHeight, naturalWidth, naturalHeight });
    };

    setImagePosition(null);

    const ro = new ResizeObserver(calculatePosition);
    ro.observe(containerEl);
    
    if (imageEl) {
      imageEl.addEventListener('load', calculatePosition);
      calculatePosition();
    }

    return () => {
        ro.disconnect();
        if (imageEl) {
            imageEl.removeEventListener('load', calculatePosition);
        }
    };
  }, [imageUrl]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoading || !imageUrl || selectionBox) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const imagePos = imagePosition;
    if (!rect || !imagePos) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (
      x < imagePos.offsetX ||
      x > imagePos.offsetX + imagePos.renderedWidth ||
      y < imagePos.offsetY ||
      y > imagePos.offsetY + imagePos.renderedHeight
    ) {
      return;
    }

    setStartPoint({ x, y });
    setDragSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!startPoint || !canvasRef.current || selectionBox) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const imagePos = imagePosition;
    if (!rect || !imagePos) return;

    let currentX = e.clientX - rect.left;
    let currentY = e.clientY - rect.top;

    currentX = Math.max(
      imagePos.offsetX,
      Math.min(currentX, imagePos.offsetX + imagePos.renderedWidth)
    );
    currentY = Math.max(
      imagePos.offsetY,
      Math.min(currentY, imagePos.offsetY + imagePos.renderedHeight)
    );

    const newSelection: BoundingBox = {
      x: Math.min(startPoint.x, currentX),
      y: Math.min(startPoint.y, currentY),
      width: Math.abs(currentX - startPoint.x),
      height: Math.abs(currentY - startPoint.y),
    };
    setDragSelection(newSelection);
  };

  const handleMouseUp = () => {
    const imagePos = imagePosition;

    if (
      dragSelection &&
      dragSelection.width > 10 &&
      dragSelection.height > 10 &&
      !selectionBox &&
      imagePos
    ) {
      const { scale, offsetX, offsetY, naturalWidth, naturalHeight } = imagePos;

      const selectionX_relative = dragSelection.x - offsetX;
      const selectionY_relative = dragSelection.y - offsetY;

      let finalBox: BoundingBox = {
        x: selectionX_relative / scale,
        y: selectionY_relative / scale,
        width: dragSelection.width / scale,
        height: dragSelection.height / scale,
      };
      
      finalBox.x = Math.max(0, finalBox.x);
      finalBox.y = Math.max(0, finalBox.y);
      finalBox.width = Math.min(naturalWidth - finalBox.x, finalBox.width);
      finalBox.height = Math.min(naturalHeight - finalBox.y, finalBox.height);

      onSelect(finalBox);
    }
    setStartPoint(null);
    setDragSelection(null);
  };
  
  const getCursorStyle = () => {
      if (!imageUrl) return 'default';
      if (selectionBox) return 'default';
      if (editMode === 'pre_add') return 'crosshair';
      return 'crosshair';
  };

  return (
    <div className="flex-grow bg-gray-800 flex items-center justify-center overflow-hidden">
      <div
        ref={canvasRef}
        className="relative w-full h-full bg-gray-700/50 rounded-b-lg shadow-inner overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: getCursorStyle() }}
      >
        {(isLoading || isProcessingSelection) && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-30">
            <LoadingSpinner className="w-12 h-12 text-yellow-400" />
            <p className="mt-4 text-lg font-medium">
              {isProcessingSelection ? 'Analyzing selection...' : 'Processing...'}
            </p>
          </div>
        )}

        {!imageUrl && !isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <p className="text-xl font-medium mb-2">Welcome to Banana Peel</p>
            <p>
              Generate an image with a prompt or upload your own.
            </p>
            <p className="mt-4">
              Edit using natural or structured prompts, or select objects on the canvas for precise control.
            </p>
          </div>
        )}

        {imageUrl && (
          <img
            ref={imageRef}
            src={imageUrl}
            alt="canvas content"
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {dragSelection && (
          <div
            className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400 bg-opacity-20 pointer-events-none"
            style={{
              left: dragSelection.x,
              top: dragSelection.y,
              width: dragSelection.width,
              height: dragSelection.height,
            }}
          />
        )}
        
        {selectionBox && imagePosition && (
          <div
            className="absolute border-2 border-dashed border-yellow-400 pointer-events-none"
            style={{
              left: `${selectionBox.x * imagePosition.scale + imagePosition.offsetX}px`,
              top: `${selectionBox.y * imagePosition.scale + imagePosition.offsetY}px`,
              width: `${selectionBox.width * imagePosition.scale}px`,
              height: `${selectionBox.height * imagePosition.scale}px`,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CanvasArea;
