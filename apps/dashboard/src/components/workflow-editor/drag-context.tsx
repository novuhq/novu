import { createContext, useContext } from 'react';
import { AddStepMenuSelection } from './add-step-menu';
import { NODE_TYPE_TO_STEP_TYPE } from './node-utils';

interface CanvasContextType {
  isReadOnly?: boolean;
  areConditionsClickable?: boolean;
  showStepPreview?: boolean;
  /** Code-first (bridge) workflows synced from the framework — canvas reordering is not supported */
  isCodeFirstWorkflow?: boolean;
  onNodeDragStart: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDragMove: (position: { x: number; y: number }) => void;
  onNodeDragEnd: () => void;
  draggedNodeId: string | null;
  intersectingNodeId: string | null;
  intersectingEdgeId: string | null;
  animatingNodeIds: Set<string>;
  copyNode: (copyIndex: number) => void;
  addNode: (insertIndex: number, selection: AddStepMenuSelection | keyof typeof NODE_TYPE_TO_STEP_TYPE) => void;
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
