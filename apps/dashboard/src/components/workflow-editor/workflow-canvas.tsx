import { EnvironmentEnum, EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useUser } from '@clerk/clerk-react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineToast } from '@/components/primitives/inline-toast';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { CanvasContext } from './drag-context';
import { edgeTypes, nodeTypes } from './node-utils';
import { useCanvasNodesEdges } from './use-canvas-nodes-edges';
import { WorkflowChecklist } from './workflow-checklist';

const panOnDrag = [1, 2];

const WorkflowCanvasChild = ({
  steps,
  showStepPreview,
  isReadOnly,
}: {
  steps: Step[];
  showStepPreview?: boolean;
  isReadOnly?: boolean;
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { currentEnvironment } = useEnvironment();
  const { workflow } = useWorkflow();
  const navigate = useNavigate();
  const { user } = useUser();

  const {
    nodes,
    edges,
    draggedNodeId,
    intersectingNodeId,
    intersectingEdgeId,
    removeEdges,
    updateEdges,
    selectNode,
    selectedNodeId,
    unselectNode,
    onNodeDragStart,
    onNodeDragMove,
    onNodeDragEnd,
    copyNode,
    addNode,
    removeNode,
  } = useCanvasNodesEdges({
    steps,
    reactFlowInstance,
    reactFlowWrapper,
  });

  useEffect(() => {
    const oldClientWidth = reactFlowWrapper.current?.clientWidth ?? 0;
    const listener = () => {
      const currentClientWidth = reactFlowWrapper.current?.clientWidth;
      if (!currentClientWidth || currentClientWidth === oldClientWidth) return;

      const difference = currentClientWidth - oldClientWidth;
      const newX = difference / 2;

      reactFlowInstance.setViewport({ x: newX, y: 0, zoom: 1 });
    };

    window.addEventListener('resize', listener);

    return () => {
      window.removeEventListener('resize', listener);
    };
  }, [reactFlowInstance]);

  const dragContextValue = useMemo(() => {
    return {
      isReadOnly,
      showStepPreview,
      onNodeDragStart,
      onNodeDragMove,
      onNodeDragEnd,
      draggedNodeId,
      intersectingNodeId,
      intersectingEdgeId,
      updateEdges,
      removeEdges,
      copyNode,
      addNode,
      removeNode,
      selectNode,
      selectedNodeId,
      unselectNode,
    };
  }, [
    isReadOnly,
    showStepPreview,
    onNodeDragStart,
    onNodeDragMove,
    onNodeDragEnd,
    draggedNodeId,
    intersectingNodeId,
    intersectingEdgeId,
    removeEdges,
    updateEdges,
    copyNode,
    addNode,
    removeNode,
    selectNode,
    selectedNodeId,
    unselectNode,
  ]);

  return (
    <CanvasContext.Provider value={dragContextValue}>
      {/* biome-ignore lint/correctness/useUniqueElementIds: used for the preview hover card */}
      <div ref={reactFlowWrapper} className="h-full w-full" id="workflow-canvas-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
            if (isReadOnly) {
              return;
            }

            // unselect node if clicked on background
            unselectNode();
            if (currentEnvironment?.slug && workflow?.slug) {
              navigate(
                buildRoute(ROUTES.EDIT_WORKFLOW, {
                  environmentSlug: currentEnvironment.slug,
                  workflowSlug: workflow.slug,
                })
              );
            }
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            bgColor="hsl(var(--bg-weak))"
            color="hsl(var(--bg-muted))"
          />
        </ReactFlow>

        {workflow &&
          currentEnvironment?.name === EnvironmentEnum.DEVELOPMENT &&
          workflow.origin === ResourceOriginEnum.NOVU_CLOUD &&
          !user?.unsafeMetadata?.workflowChecklistCompleted && <WorkflowChecklist steps={steps} workflow={workflow} />}
      </div>
    </CanvasContext.Provider>
  );
};

export const WorkflowCanvas = ({
  steps,
  showStepPreview,
  isReadOnly,
}: {
  steps: Step[];
  showStepPreview?: boolean;
  isReadOnly?: boolean;
}) => {
  const has = useHasPermission();
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();
  const { workflow: currentWorkflow } = useWorkflow();
  const navigate = useNavigate();
  const hasPermission = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
  const showReadOnlyOverlay =
    currentEnvironment && currentWorkflow && (!hasPermission || currentEnvironment?.type !== EnvironmentTypeEnum.DEV);

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
        <WorkflowCanvasChild
          steps={currentWorkflow?.steps || steps || []}
          showStepPreview={showStepPreview}
          isReadOnly={isReadOnly}
        />

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
