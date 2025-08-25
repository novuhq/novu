import { createContext, useContext } from 'react';

interface DragContextType {
  onNodeDragStart: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDragMove: (position: { x: number; y: number }) => void;
  onNodeDragEnd: () => void;
  draggedNodeId: string | null;
  intersectingNodeId: string | null;
  intersectingEdgeId: string | null;
  forceUpdateNodesAndEdges: () => void;
  removeEdges: () => void;
}

export const DragContext = createContext<DragContextType | null>(null);

export const useDragContext = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within DragContext.Provider');
  }
  return context;
};
