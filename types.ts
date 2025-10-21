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
  outputText?: string;
}

// Add shared EditMode and PromptMode types.
export type EditMode = 'modify' | 'add' | 'pre_add' | null;
export type PromptMode = 'freeform' | 'structured';

export interface HistoryState {
  url: string;
  mimeType: string;
  structuredDescription?: string | null;
}