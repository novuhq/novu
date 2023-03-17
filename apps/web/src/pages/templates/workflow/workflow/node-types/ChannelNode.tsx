import { ChannelTypeEnum } from '@novu/shared';
import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, getOutgoers, useReactFlow, useNodes } from 'react-flow-renderer';
import { ChannelButton } from '../../../../../design-system';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
  tabKey: string;
  index: number;
  testId: string;
  onDelete: (id: string) => void;
  error: string;
  setActivePage: (string) => void;
  active?: boolean;
  channelType: ChannelTypeEnum;
}

export default memo(
  ({ data, selected, id, dragging }: { data: NodeData; selected: boolean; id: string; dragging: boolean }) => {
    const { getNode, getEdges, getNodes } = useReactFlow();
    const nodes = useNodes<NodeData>();
    const thisNode = getNode(id);
    const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
    const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (![ChannelTypeEnum.EMAIL, ChannelTypeEnum.IN_APP].includes(data.channelType)) {
        setCount(0);

        return;
      }

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
        <ChannelButton
          setActivePage={data.setActivePage}
          errors={data.error}
          onDelete={data.onDelete}
          tabKey={data.tabKey}
          Icon={data.Icon}
          label={data.label + (count > 0 ? ` (${count})` : '')}
          active={selected}
          disabled={!data.active}
          id={id}
          index={data.index}
          dragging={dragging}
        />
        <Handle type="target" id="b" position={Position.Top} />
        <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
      </div>
    );
  }
);
