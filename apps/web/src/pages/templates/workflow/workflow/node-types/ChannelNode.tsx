import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, getOutgoers, useReactFlow, useNodes } from 'react-flow-renderer';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { WorkflowNode } from './WorkflowNode';
import { useNavigate, useParams } from 'react-router-dom';
import { useBasePath } from '../../../hooks/useBasePath';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
  tabKey: ChannelTypeEnum;
  index: number;
  testId: string;
  onDelete: (uuid: string) => void;
  error: string;
  active?: boolean;
  channelType: StepTypeEnum;
  uuid: string;
}

export default memo(
  ({ data, selected, id, dragging }: { data: NodeData; selected: boolean; id: string; dragging: boolean }) => {
    const { getNode, getEdges, getNodes } = useReactFlow();
    const nodes = useNodes<NodeData>();
    const thisNode = getNode(id);
    const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
    const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };
    const [count, setCount] = useState(0);
    const navigate = useNavigate();
    const basePath = useBasePath();
    const { stepUuid = '' } = useParams<{ stepUuid: string }>();

    useEffect(() => {
      const items = nodes
        .filter((node) => node.type === 'channelNode')
        .filter((node) => {
          return node.data.channelType === data.channelType;
        });

      if (items.length <= 1) {
        setCount(0);

        return;
      }

      const foundIndex = items.findIndex((node) => node.id === id);

      if (foundIndex === -1) {
        setCount(0);

        return;
      }

      setCount(foundIndex + 1);
    }, [nodes.length, data, id]);

    return (
      <div data-test-id={`node-${data.testId}`} style={{ pointerEvents: 'none' }}>
        <WorkflowNode
          errors={data.error}
          onDelete={() => {
            data.onDelete(data.uuid);
          }}
          tabKey={data.tabKey}
          channelType={data.channelType}
          Icon={data.Icon}
          label={data.label + (count > 0 ? ` (${count})` : '')}
          active={stepUuid === data.uuid}
          disabled={!data.active}
          id={id}
          index={data.index}
          dragging={dragging}
          onClick={() => {
            navigate(basePath + `/${data.channelType}/${data.uuid}`);
          }}
        />
        <Handle type="target" id="b" position={Position.Top} />
        <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
      </div>
    );
  }
);
