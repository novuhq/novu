import { EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import { Edge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';
import { RiInsertRowTop } from 'react-icons/ri';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { fadeIn } from '@/utils/animation';
import { AddStepMenu } from './add-step-menu';
import { NODE_WIDTH } from './base-node';
import { useCanvasContext } from './drag-context';

export type AddNodeEdgeType = Edge<{ isLast: boolean; addStepIndex: number }>;

export function AddNodeEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data = { isLast: false, addStepIndex: 0 },
  markerEnd,
  id,
}: EdgeProps<AddNodeEdgeType>) {
  const { workflow } = useWorkflow();
  const has = useHasPermission();
  const { currentEnvironment } = useEnvironment();
  const { intersectingEdgeId, draggedNodeId, addNode } = useCanvasContext();
  const isAnyNodeDragging = draggedNodeId !== null;

  const isReadOnly =
    workflow?.origin === ResourceOriginEnum.EXTERNAL ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE }) ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  const isIntersecting = intersectingEdgeId === id;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <AnimatePresence>
        <motion.path
          {...fadeIn}
          markerEnd={markerEnd}
          style={style}
          d={edgePath}
          fill="none"
          className="react-flow__edge-path color-neutral-alpha-200"
          key={`${id}-path`}
        />
        <motion.path
          {...fadeIn}
          d={edgePath}
          fill="none"
          strokeOpacity={0}
          strokeWidth={20}
          className="react-flow__edge-interaction color-neutral-alpha-200"
          key={`${id}-interaction`}
        />
      </AnimatePresence>
      {!data.isLast && (
        <EdgeLabelRenderer>
          <div
            className="bg-background rounded-lg border border-dashed border-bg-soft flex items-center justify-center gap-1"
            style={{
              position: 'absolute',
              transition: 'opacity 0.2s ease-in-out',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              // everything inside EdgeLabelRenderer has no pointer events by default
              // if you have an interactive element, set pointer-events: all
              pointerEvents: 'all',
              width: NODE_WIDTH,
              height: 32,
              opacity: isIntersecting ? 1 : 0,
            }}
            data-droppable-edge-id={id}
          >
            <RiInsertRowTop className="size-3.5 text-text-soft" />
            <span className="text-label-xs text-text-soft">Drop here</span>
          </div>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              // everything inside EdgeLabelRenderer has no pointer events by default
              // if you have an interactive element, set pointer-events: all
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {!isReadOnly && !isAnyNodeDragging && (
              <AddStepMenu onMenuItemClick={async (stepType) => addNode(data.addStepIndex, stepType)} />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DefaultEdge = ({ id, sourceX, sourceY, targetX, targetY, style }: EdgeProps) => {
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  return (
    <AnimatePresence>
      <motion.path
        {...fadeIn}
        layout
        layoutId={id}
        style={style}
        d={edgePath}
        fill="none"
        className="react-flow__edge-path color-neutral-alpha-200"
        key={`${id}-path`}
      />
      <motion.path
        {...fadeIn}
        layout
        layoutId={id}
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction color-neutral-alpha-200"
        key={`${id}-interaction`}
      />
    </AnimatePresence>
  );
};
