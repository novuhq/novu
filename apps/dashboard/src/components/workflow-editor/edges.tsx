import { EnvironmentTypeEnum, FeatureFlagsKeysEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { RiInsertRowTop } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { createStep } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { useHasPermission } from '@/hooks/use-has-permission';
import { INLINE_CONFIGURABLE_STEP_TYPES, TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { buildRoute, ROUTES } from '@/utils/routes';
import { AddStepMenu } from './add-step-menu';
import { NODE_WIDTH } from './base-node';
import { useDragContext } from './workflow-canvas';

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
  const { workflow, update } = useWorkflow();
  const navigate = useNavigate();
  const has = useHasPermission();
  const { currentEnvironment } = useEnvironment();
  const { intersectingEdgeId, draggedNodeId } = useDragContext();
  const isLayoutsPageActive = useFeatureFlag(FeatureFlagsKeysEnum.IS_LAYOUTS_PAGE_ACTIVE);
  const { data: layoutsResponse, isFetching: isFetchingLayouts } = useFetchLayouts({
    limit: 100,
    refetchOnWindowFocus: false,
  });
  const defaultLayout = layoutsResponse?.layouts.find((layout) => layout.isDefault);
  const addDefaultLayout = isLayoutsPageActive && !!defaultLayout;
  const defaultLayoutId = defaultLayout?.layoutId;
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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} key={id} />
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
              <AddStepMenu
                onMenuItemClick={async (stepType) => {
                  if (workflow && !isFetchingLayouts) {
                    const indexToAdd = data.addStepIndex;

                    const newStep = createStep(
                      stepType,
                      addDefaultLayout ? defaultLayoutId : undefined,
                      workflow.severity
                    );

                    const updatedSteps = [
                      ...workflow.steps.slice(0, indexToAdd),
                      newStep,
                      ...workflow.steps.slice(indexToAdd),
                    ];

                    update(
                      {
                        ...workflow,
                        steps: updatedSteps,
                      },
                      {
                        onSuccess: (data) => {
                          if (TEMPLATE_CONFIGURABLE_STEP_TYPES.includes(stepType)) {
                            if (currentEnvironment?.slug) {
                              navigate(
                                buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                                  stepSlug: data.steps[indexToAdd].slug,
                                })
                              );
                            }
                          } else if (INLINE_CONFIGURABLE_STEP_TYPES.includes(stepType)) {
                            navigate(
                              buildRoute(ROUTES.EDIT_STEP, {
                                stepSlug: data.steps[indexToAdd].slug,
                              })
                            );
                          }
                        },
                      }
                    );
                  }
                }}
              />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
