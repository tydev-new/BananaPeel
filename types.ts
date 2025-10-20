import { v4 as uuidv4 } from 'uuid';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImagePositionInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

// FIX: Add Transform and SelectableObject types to resolve module resolution errors.
export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface SelectableObject {
  id: string;
  originalBox: BoundingBox;
  displayImageUrl: string;
  transform: Transform;
}

export interface ApiImage {
  label: string;
  url: string;
}

export interface ApiCallRecord {
  id: string;
  timestamp: string;
  functionName: string;
  prompt: string;
  inputImages: ApiImage[];
  outputImages: ApiImage[];
}