import { ComponentType, MouseEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  EdgeProps,
  getOutgoers,
  Node,
  NodeProps,
  ReactFlowProps,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'react-flow-renderer';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import { v4 as uuid4 } from 'uuid';
import cloneDeep from 'lodash.clonedeep';
import { StepTypeEnum } from '@novu/shared';

import { colors } from '@novu/design-system';
import { getChannel } from '../../utils/channels';
import { useEnvController } from '../../hooks';
import type { IEdge, IFlowStep, INode } from './types';
import { useTemplateEditorForm } from '../../pages/templates/components/TemplateEditorFormProvider';

const triggerNode: Node = {
  id: '1',
  type: 'triggerNode',
  data: {
    label: 'Trigger',
  },
  position: { x: 0, y: 10 },
};

const DEFAULT_WRAPPER_STYLES = {
  height: '100%',
  width: '100%',
  minHeight: '600px',
};

export interface IFlowEditorProps extends ReactFlowProps {
  isReadonly?: boolean;
  steps: IFlowStep[];
  dragging?: boolean;
  errors?: any;
  nodeTypes: Record<string, ComponentType<NodeProps>>;
  edgeTypes?: { special: ComponentType<EdgeProps> };
  withControls?: boolean;
  wrapperStyles?: React.CSSProperties;
  onEdit?: (e: MouseEvent<HTMLButtonElement>, node: INode) => void;
  onDelete?: (id: string) => void;
  onAddVariant?: (id: string) => void;
  onStepInit?: (step: IFlowStep) => Promise<void>;
  onGetStepError?: (i: number, errors: any) => string;
  addStep?: (channelType: StepTypeEnum, id: string, index?: number) => void;
  sidebarOpen?: boolean;
}

export function FlowEditor({
  isReadonly = false,
  steps,
  dragging,
  errors,
  defaultEdgeOptions = {
    type: 'smoothstep',
  },
  zoomOnScroll = false,
  preventScrolling = true,
  nodesConnectable = false,
  nodesDraggable = true,
  minZoom = 0.5,
  maxZoom = 1.5,
  defaultZoom = 1,
  nodeTypes,
  edgeTypes,
  withControls = true,
  wrapperStyles = DEFAULT_WRAPPER_STYLES,
  onStepInit,
  onGetStepError,
  addStep,
  onEdit,
  onDelete,
  onAddVariant,
  sidebarOpen,
  ...restProps
}: IFlowEditorProps) {
  const { colorScheme } = useMantineColorScheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<IEdge>([]);
  const reactFlowInstance = useReactFlow();
  const { template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);

  useEffect(() => {
    const clientWidth = reactFlowWrapper.current?.clientWidth;
    const sub = sidebarOpen ? 300 : 100;
    const middle = clientWidth ? clientWidth / 2 - sub : 0;
    const zoomView = 1;

    reactFlowInstance.setViewport({ x: middle, y: 10, zoom: zoomView });
  }, [reactFlowInstance, sidebarOpen]);

  useEffect(() => {
    setTimeout(() => {
      initializeWorkflowTree();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, dragging, errors, readonly]);

  const addNewNode = useCallback(
    (parentNodeId: string, channelType: string, childId?: string) => {
      if (!addStep) return;

      const channel = getChannel(channelType);
      if (!channel) return;

      const newId = uuid4();
      const nodeIndex = childId ? steps.findIndex((step) => step._id === parentNodeId) + 1 : undefined;

      addStep(channel.channelType, newId, nodeIndex);
    },
    [addStep, steps]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const parentId = nodes[nodes.length - 2].id;

      if (typeof type === 'undefined' || !type || typeof parentId === 'undefined') {
        return;
      }

      const parentNode = reactFlowInstance.getNode(parentId);
      if (typeof parentNode === 'undefined') {
        return;
      }

      const childNode = getOutgoers(parentNode, nodes, edges);

      if (childNode.length) {
        return;
      }

      addNewNode(parentId, type);
    },
    [addNewNode, reactFlowInstance, nodes, edges]
  );

  async function initializeWorkflowTree() {
    let parentId = '1';
    const finalNodes = [cloneDeep(triggerNode)];
    let finalEdges: Edge<any>[] = [];
    let isParentVariantNode = false;

    if (steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const oldNode = nodes[i + 1];
        const position =
          oldNode && oldNode.type !== 'addNode' ? oldNode.position : { x: 0, y: isParentVariantNode ? 160 : 120 };
        const newId = (step._id || step.id) as string;

        await onStepInit?.(step);

        const newNode = buildNewNode(newId, position, parentId, step, i);
        isParentVariantNode = newNode.data.step.variants && newNode.data.step.variants?.length > 0;

        finalNodes.push(newNode);

        const edgeType = edgeTypes ? 'special' : 'default';
        const newEdge = buildNewEdge(parentId, newId, edgeType);
        finalEdges = addEdge(newEdge, finalEdges);

        parentId = newId;
      }
    }
    if (!readonly && nodeTypes.addNode) {
      const addNodeButton = buildAddNodeButton(parentId, isParentVariantNode);
      finalNodes.push(addNodeButton);
    }

    setNodes(finalNodes);
    setEdges(finalEdges);
  }

  function buildNewNode(
    newId: string,
    position: { x: number; y: number },
    parentId: string,
    step: IFlowStep,
    i: number
  ): Node {
    const channel = getChannel(step.template?.type);
    const hasVariants = step.variants && step.variants?.length > 0;

    return {
      id: newId,
      type: 'channelNode',
      position: { x: position.x, y: position.y },
      parentNode: parentId,
      data: {
        ...channel,
        isReadonly,
        index: i,
        error: onGetStepError?.(i, errors) ?? '',
        onDelete,
        onAddVariant,
        onEdit,
        step,
      },
      // this class is needed to update the node height for nodes with variants
      ...(hasVariants && { className: 'variantNode' }),
    };
  }

  function buildNewEdge(parentId: string, newId: string, type: string): Edge {
    return {
      id: `e-${parentId}-${newId}`,
      source: parentId,
      sourceHandle: 'a',
      targetHandle: 'b',
      target: newId,
      type,
      data: { addNewNode: addNewNode, parentId: parentId, childId: newId, readonly: readonly },
    };
  }

  function buildAddNodeButton(parentId: string, isParentVariantNode: boolean): Node {
    return {
      id: '2',
      type: 'addNode',
      data: {
        label: '',
        addNewNode,
        parentId,
        showDropZone: dragging,
        readonly,
      },
      className: 'nodrag',
      connectable: false,
      parentNode: parentId,
      position: { x: 0, y: isParentVariantNode ? 130 : 90 },
    };
  }

  const handleMouseEnterEdgeOrNode = (edgeId: string) => {
    const edgeElement = document.getElementById(edgeId);
    if (!edgeElement) return;
    edgeElement.classList.add('fade');
  };

  const handleMouseLeaveEdgeOrNode = (edgeId: string) => {
    const edgeElement = document.getElementById(edgeId);
    if (!edgeElement) return;
    edgeElement.classList.remove('fade');
  };

  return (
    <>
      <Wrapper dark={colorScheme === 'dark'}>
        <div style={wrapperStyles} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeMouseEnter={(event, node) => {
              if (!readonly) {
                handleMouseEnterEdgeOrNode(`edge-button-${node.id}`);
              }
            }}
            onNodeMouseLeave={(event, node) => {
              if (!readonly) {
                handleMouseLeaveEdgeOrNode(`edge-button-${node.id}`);
              }
            }}
            onEdgeMouseEnter={(event: ReactMouseEvent, edge: Edge) => {
              if (!readonly) {
                handleMouseEnterEdgeOrNode(`edge-button-${edge.source}`);
              }
            }}
            onEdgeMouseLeave={(event: ReactMouseEvent, edge: Edge) => {
              if (!readonly) {
                handleMouseLeaveEdgeOrNode(`edge-button-${edge.source}`);
              }
            }}
            /*
             * TODO: for now this disables the deletion of a step using delete/backspace keys
             * as it will require some sort of refactoring of how we save the workflow state
             * to properly support keyboard delete events
             * Remove this line once we tackle the workflow state handling
             */
            deleteKeyCode={null}
            defaultEdgeOptions={defaultEdgeOptions}
            zoomOnScroll={zoomOnScroll}
            preventScrolling={preventScrolling}
            nodesConnectable={nodesConnectable}
            nodesDraggable={nodesDraggable}
            minZoom={minZoom}
            maxZoom={maxZoom}
            defaultZoom={defaultZoom}
            {...restProps}
          >
            {withControls && <Controls />}
            <Background
              size={1}
              gap={10}
              variant={BackgroundVariant.Dots}
              color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
            />
          </ReactFlow>
        </div>
      </Wrapper>
    </>
  );
}

export default FlowEditor;

const Wrapper = styled.div<{ dark: boolean }>`
  flex: 1 1 0%;
  background: ${({ dark }) => (dark ? colors.B15 : colors.B98)};
  .react-flow__node.react-flow__node-channelNode,
  .react-flow__node.react-flow__node-triggerNode {
    width: 280px;
    height: 80px;
    cursor: pointer;

    [data-blue-gradient-svg] {
      stop:first-of-type {
        stop-color: #4c6dd4 !important;
      }
      stop:last-child {
        stop-color: #66d9e8 !important;
      }
    }

    [data-workflow-node-icon] {
      stop {
        stop-color: white !important;
      }
    }
  }
  .react-flow__node.variantNode {
    height: 120px;
  }

  .react-flow__node.react-flow__node-addNode {
    cursor: default;
    width: 280px;
  }
  .react-flow__handle.connectable {
    cursor: pointer;
  }
  .react-flow__handle {
    background: transparent;
    border: 1px solid ${colors.B60};
  }
  .react-flow__attribution {
    background: transparent;
    opacity: 0.5;
    z-index: 1;
  }
  .react-flow__edge-path {
    stroke: ${colors.B60};
    border-radius: 10px;
    stroke-dasharray: 5;
    stroke-width: 2px;
  }
  .react-flow__node.selected {
    .react-flow__handle {
      background: ${colors.horizontal};
      border: none;
    }
  }

  .react-flow__controls {
    box-shadow: none;
  }

  .react-flow__controls-interactive {
    display: none;
  }

  .react-flow__controls-button {
    background: transparent;
    border: none;

    svg {
      fill: ${colors.B60};
    }
  }

  [data-template-store-editor] [data-workflow-node-icon] {
    stop:first-of-type {
      stop-color: #dd2476 !important;
    }
    stop:last-child {
      stop-color: #ff512f !important;
    }
  }
`;
