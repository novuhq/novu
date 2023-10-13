import { memo, useEffect, useState } from 'react';
import { Handle, Position, getOutgoers, useReactFlow, useNodes } from 'react-flow-renderer';

import { WorkflowNode } from './WorkflowNode';
import { useParams } from 'react-router-dom';
import { INode } from '../../../../../components/workflow/types';
import { useStepSubtitle } from '../../../hooks/useStepSubtitle';

export default memo((node: INode) => {
  const { data, id, dragging } = node;
  const {
    testId,
    error,
    channelType,
    step,
    label,
    index,
    tabKey,
    Icon,
    onAddVariant,
    onDelete,
    onEdit,
    onAddConditions,
  } = data;

  const { getNode, getEdges, getNodes } = useReactFlow();
  const nodes = useNodes<INode['data']>();
  const thisNode = getNode(id);
  const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };
  const [count, setCount] = useState(0);
  const { stepUuid = '' } = useParams<{ stepUuid: string }>();

  useEffect(() => {
    const items = nodes
      .filter((el) => el.type === 'channelNode')
      .filter((el) => {
        return el.data.channelType === channelType;
      });

    if (items.length <= 1) {
      setCount(0);

      return;
    }

    const foundIndex = items.findIndex((el) => el.id === id);

    if (foundIndex === -1) {
      setCount(0);

      return;
    }

    setCount(foundIndex + 1);
  }, [nodes, channelType, id]);

  const subtitle = useStepSubtitle(step, channelType);

  if (!step) {
    return null;
  }

  const { active, uuid, name } = step;
  const variantsCount = step.variants?.length;

  return (
    <div data-test-id={`node-${testId}`} style={{ pointerEvents: 'none' }}>
      <WorkflowNode
        errors={error}
        onEdit={(e) => {
          e.preventDefault();
          e.stopPropagation();

          onEdit(e, node);
        }}
        onDelete={() => {
          onDelete(uuid ?? '');
        }}
        onAddVariant={() => {
          onAddVariant(uuid ?? '');
        }}
        onAddConditions={() => {
          onAddConditions(uuid ?? '');
        }}
        nodeType={variantsCount && variantsCount > 0 ? 'stepRoot' : 'step'}
        variantsCount={variantsCount}
        tabKey={tabKey}
        channelType={channelType}
        Icon={Icon}
        label={name ? name : label + (count > 0 ? ` (${count})` : '')}
        active={stepUuid === uuid}
        disabled={!active}
        id={id}
        index={index}
        testId={'channel-node'}
        dragging={dragging}
        subtitle={subtitle}
      />
      <Handle type="target" id="b" position={Position.Top} />
      <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
