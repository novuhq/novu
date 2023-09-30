import { EdgeProps, getBezierEdgeCenter, getBezierPath } from 'react-flow-renderer';
import AddNode from '../node-types/AddNode';
import styled from '@emotion/styled';

const foreignObjectSize = 30;

export function AddNodeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) {
  const [centerX, centerY] = getBezierEdgeCenter({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { childId, parentId, addNewNode, readonly } = data;

  return (
    <>
      <path style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />

      <NodeWrapper
        size={foreignObjectSize}
        width={foreignObjectSize}
        height={foreignObjectSize}
        x={centerX - foreignObjectSize / 2}
        y={centerY - foreignObjectSize / 2}
        requiredExtensions="http://www.w3.org/1999/xhtml"
        id={`edge-button-${parentId}`}
        className={id}
      >
        <div>
          <AddNode
            data={{
              parentId: parentId,
              addNewNode: addNewNode,
              showDropZone: false,
              childId: childId,
              readonly: readonly,
            }}
          />
        </div>
      </NodeWrapper>
    </>
  );
}

const NodeWrapper = styled.foreignObject<{ size: number }>`
  opacity: 0;
  height: ${({ size }) => `${size}px`};
  width: ${({ size }) => `${size}px`};
  -webkit-transition: opacity 0.3s ease-in-out;
  -moz-transition: opacity 0.3s ease-in-out;
  -ms-transition: opacity 0.3s ease-in-out;
  -o-transition: opacity 0.3s ease-in-out;
  transition: opacity 0.3s ease-in-out;

  &.fade {
    opacity: 1;
  }
`;
