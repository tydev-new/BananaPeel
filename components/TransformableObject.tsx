import React, { useRef, useEffect, useCallback } from 'react';
import { SelectableObject, Transform, ImagePositionInfo } from '../types';
import { RotateIcon } from './icons';

interface TransformableObjectProps {
  object: SelectableObject;
  onTransform: (id: string, newTransform: Transform) => void;
  // FIX: Make containerRect and imagePosition optional. They are passed by the parent CanvasArea via React.cloneElement.
  containerRect?: DOMRect | null;
  imagePosition?: ImagePositionInfo | null;
}

const TransformableObject: React.FC<TransformableObjectProps> = ({ object, onTransform, containerRect, imagePosition }) => {
  const objectRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    type: 'move' | 'scale' | 'rotate' | null;
    startX: number;
    startY: number;
    startTransform: Transform;
    startDistance?: number;
    startAngle?: number;
    objectCenterX?: number;
    objectCenterY?: number;
  }>({ type: null, startX: 0, startY: 0, startTransform: object.transform });

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>, 
    type: 'move' | 'scale' | 'rotate'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!objectRef.current || !containerRect) return;
    const objectRect = objectRef.current.getBoundingClientRect();
    const objectCenterX = objectRect.left - containerRect.left + objectRect.width / 2;
    const objectCenterY = objectRect.top - containerRect.top + objectRect.height / 2;

    interactionRef.current = {
        type: type,
        startX: e.clientX,
        startY: e.clientY,
        startTransform: { ...object.transform },
        objectCenterX,
        objectCenterY,
        startDistance: Math.hypot(e.clientX - containerRect.left - objectCenterX, e.clientY - containerRect.top - objectCenterY),
        startAngle: Math.atan2(e.clientY - containerRect.top - objectCenterY, e.clientX - containerRect.left - objectCenterX) * 180 / Math.PI,
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { type, startX, startY, startTransform, objectCenterX, objectCenterY, startDistance, startAngle } = interactionRef.current;
    if (!type || !containerRect) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newTransform = { ...startTransform };

    switch (type) {
      case 'move':
        newTransform.x = startTransform.x + dx;
        newTransform.y = startTransform.y + dy;
        break;
      case 'scale':
        if(objectCenterX && objectCenterY && startDistance) {
            const currentDistance = Math.hypot(e.clientX - (containerRect.left + objectCenterX), e.clientY - (containerRect.top + objectCenterY));
            const scale = currentDistance / startDistance;
            newTransform.scale = startTransform.scale * scale;
        }
        break;
      case 'rotate':
        if(objectCenterX && objectCenterY && startAngle !== undefined) {
            const currentAngle = Math.atan2(e.clientY - (containerRect.top + objectCenterY), e.clientX - (containerRect.left + objectCenterX)) * 180 / Math.PI;
            newTransform.rotation = startTransform.rotation + (currentAngle - startAngle);
        }
        break;
    }
    onTransform(object.id, newTransform);
  }, [containerRect, onTransform, object.id]);

  const handleMouseUp = useCallback(() => {
    interactionRef.current.type = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  if (!imagePosition) {
    return null; // Don't render until we know where the image is
  }

  const { scale, offsetX, offsetY } = imagePosition;
  const { originalBox, transform } = object;

  return (
    <div
      ref={objectRef}
      className="absolute border-2 border-dashed border-yellow-400 cursor-move"
      style={{
        left: `${originalBox.x * scale + offsetX}px`,
        top: `${originalBox.y * scale + offsetY}px`,
        width: `${originalBox.width * scale}px`,
        height: `${originalBox.height * scale}px`,
        transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
        transformOrigin: 'center center',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      <img src={object.displayImageUrl} className="w-full h-full pointer-events-none" alt="selected object"/>

      {/* Resize Handle */}
      <div
        className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full cursor-nwse-resize border-2 border-gray-800"
        onMouseDown={(e) => handleMouseDown(e, 'scale')}
      />

      {/* Rotate Handle */}
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-yellow-400 rounded-full cursor-alias flex items-center justify-center border-2 border-gray-800"
        onMouseDown={(e) => handleMouseDown(e, 'rotate')}
      >
        <RotateIcon className="w-4 h-4 text-gray-800" />
      </div>
    </div>
  );
};

export default TransformableObject;