import { createContext, useContext } from 'react';
import { NODE_TYPE_TO_STEP_TYPE } from './node-utils';

interface CanvasContextType {
  isReadOnly?: boolean;
  showStepPreview?: boolean;
  onNodeDragStart: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDragMove: (position: { x: number; y: number }) => void;
  onNodeDragEnd: () => void;
  draggedNodeId: string | null;
  intersectingNodeId: string | null;
  intersectingEdgeId: string | null;
  updateEdges: () => void;
  removeEdges: () => void;
  copyNode: (copyIndex: number) => void;
  addNode: (insertIndex: number, type: keyof typeof NODE_TYPE_TO_STEP_TYPE) => void;
  removeNode: (removeIndex: number, options?: { onSuccess?: () => void; onError?: () => void }) => void;
  selectNode: (id: string, goto: 'editor' | 'view') => void;
  unselectNode: () => void;
  selectedNodeId: string | undefined;
}

export const CanvasContext = createContext<CanvasContextType | null>(null);

export const useCanvasContext = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useDragContext must be used within DragContext.Provider');
  }
  return context;
};
