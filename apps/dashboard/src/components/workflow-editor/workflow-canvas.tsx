import { EnvironmentEnum, EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportHelperFunctionOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { NODE_WIDTH } from './base-node';
import { DragContext } from './drag-context';
import { edgeTypes, nodeTypes } from './node-utils';
import { useCanvasNodesEdges } from './use-canvas-nodes-edges';
import { WorkflowChecklist } from './workflow-checklist';

const panOnDrag = [1, 2];

const WorkflowCanvasChild = ({
  steps,
  isTemplateStorePreview,
}: {
  steps: Step[];
  isTemplateStorePreview?: boolean;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { currentEnvironment } = useEnvironment();
  const { workflow: currentWorkflow } = useWorkflow();
  const navigate = useNavigate();
  const { user } = useUser();
  const {
    nodes,
    edges,
    draggedNodeId,
    intersectingNodeId,
    intersectingEdgeId,
    onNodesChange,
    onEdgesChange,
    removeEdges,
    forceUpdateNodesAndEdges,
    onNodeDragStart,
    onNodeDragMove,
    onNodeDragEnd,
  } = useCanvasNodesEdges({
    steps,
    isTemplateStorePreview,
  });

  const positionCanvas = useCallback(
    (options?: ViewportHelperFunctionOptions) => {
      const clientWidth = reactFlowWrapper.current?.clientWidth;
      const middle = clientWidth ? clientWidth / 2 - NODE_WIDTH / 2 : 0;

      reactFlowInstance.setViewport({ x: middle, y: 50, zoom: 0.99 }, options);
    },
    [reactFlowInstance]
  );

  useEffect(() => {
    const listener = () => positionCanvas({ duration: 300 });

    window.addEventListener('resize', listener);

    return () => {
      window.removeEventListener('resize', listener);
    };
  }, [positionCanvas]);

  useLayoutEffect(() => {
    positionCanvas();
  }, [positionCanvas]);

  const dragContextValue = useMemo(() => {
    return {
      onNodeDragStart,
      onNodeDragMove,
      onNodeDragEnd,
      draggedNodeId,
      intersectingNodeId,
      intersectingEdgeId,
      forceUpdateNodesAndEdges,
      removeEdges,
    };
  }, [
    onNodeDragStart,
    onNodeDragMove,
    onNodeDragEnd,
    draggedNodeId,
    intersectingNodeId,
    intersectingEdgeId,
    removeEdges,
    forceUpdateNodesAndEdges,
  ]);

  return (
    <DragContext.Provider value={dragContextValue}>
      {/* biome-ignore lint/correctness/useUniqueElementIds: used for the preview hover card */}
      <div ref={reactFlowWrapper} className="h-full w-full" id="workflow-canvas-container">
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          edges={edges}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={null}
          maxZoom={1}
          minZoom={0.9}
          panOnScroll
          selectionOnDrag
          panOnDrag={panOnDrag}
          nodesDraggable={false}
          nodesConnectable={false}
          onPaneClick={() => {
            if (isTemplateStorePreview) {
              return;
            }

            // unselect node if clicked on background
            if (currentEnvironment?.slug && currentWorkflow?.slug) {
              navigate(
                buildRoute(ROUTES.EDIT_WORKFLOW, {
                  environmentSlug: currentEnvironment.slug,
                  workflowSlug: currentWorkflow.slug,
                })
              );
            }
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} className="!bg-bg-weak" />
        </ReactFlow>

        {currentWorkflow &&
          currentEnvironment?.name === EnvironmentEnum.DEVELOPMENT &&
          currentWorkflow.origin === ResourceOriginEnum.NOVU_CLOUD &&
          !user?.unsafeMetadata?.workflowChecklistCompleted && (
            <WorkflowChecklist steps={steps} workflow={currentWorkflow} />
          )}
      </div>
    </DragContext.Provider>
  );
};

export const WorkflowCanvas = ({
  steps,
  isTemplateStorePreview,
}: {
  steps: Step[];
  isTemplateStorePreview?: boolean;
}) => {
  const has = useHasPermission();
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();
  const { workflow: currentWorkflow } = useWorkflow();
  const navigate = useNavigate();
  const hasPermission = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
  const showReadOnlyOverlay = !hasPermission || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  const handleSwitchToDevelopment = () => {
    const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

    if (developmentEnvironment?.slug && currentWorkflow?.workflowId) {
      switchEnvironment(developmentEnvironment.slug);
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: developmentEnvironment.slug,
          workflowSlug: currentWorkflow.workflowId,
        })
      );
    }
  };

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <WorkflowCanvasChild steps={steps || []} isTemplateStorePreview={isTemplateStorePreview} />

        {showReadOnlyOverlay && (
          <>
            <div
              className="border-warning/20 pointer-events-none absolute inset-x-0 top-0 border-t-[0.5px]"
              style={{
                position: 'absolute',
                height: '100%',
                background: 'linear-gradient(to bottom, hsl(var(--warning) / 0.08), transparent 4%)',
                transition: 'border 0.3s ease-in-out, background 0.3s ease-in-out',
              }}
            />
            <div className="absolute left-4 top-4 z-50">
              <InlineToast
                className="bg-warning/10 border shadow-md"
                variant={'warning'}
                description={
                  hasPermission && currentEnvironment?.type !== EnvironmentTypeEnum.DEV
                    ? 'Edit the workflow in your development environment.'
                    : 'Content visible but locked for editing. Contact an admin for edit access.'
                }
                title="View-only:"
                ctaLabel={
                  hasPermission && currentEnvironment?.type !== EnvironmentTypeEnum.DEV
                    ? 'Switch environment'
                    : undefined
                }
                onCtaClick={handleSwitchToDevelopment}
              />
            </div>
          </>
        )}
      </div>
    </ReactFlowProvider>
  );
};
