import { EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import { createStep } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { useHasPermission } from '@/hooks/use-has-permission';
import { INLINE_CONFIGURABLE_STEP_TYPES, TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { buildRoute, ROUTES } from '@/utils/routes';
import { AddStepMenu } from './add-step-menu';

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
}: EdgeProps<AddNodeEdgeType>) {
  const { workflow, update } = useWorkflow();
  const navigate = useNavigate();
  const has = useHasPermission();
  const { currentEnvironment } = useEnvironment();
  const { data: layoutsResponse, isFetching: isFetchingLayouts } = useFetchLayouts({
    limit: 100,
    refetchOnWindowFocus: false,
  });
  const defaultLayout = layoutsResponse?.layouts.find((layout) => layout.isDefault);
  const addDefaultLayout = !!defaultLayout;
  const defaultLayoutId = defaultLayout?.layoutId;

  const isReadOnly =
    workflow?.origin === ResourceOriginEnum.EXTERNAL ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE }) ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {!data.isLast && (
        <EdgeLabelRenderer>
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
            {!isReadOnly && (
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
