import { createStep } from '@/components/workflow-editor/step-utils';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { TEMPLATE_CONFIGURABLE_STEP_TYPES } from '@/utils/constants';
import { buildRoute, ROUTES } from '@/utils/routes';
import { WorkflowOriginEnum } from '@novu/shared';
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
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
  const isReadOnly = workflow?.origin === WorkflowOriginEnum.EXTERNAL;

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
                  if (workflow) {
                    const indexToAdd = data.addStepIndex;

                    const newStep = createStep(stepType);

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
                            navigate(
                              buildRoute(ROUTES.EDIT_STEP_TEMPLATE, {
                                workflowSlug: workflow.slug,
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
