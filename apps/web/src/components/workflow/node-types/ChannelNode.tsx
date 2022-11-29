import React, { memo } from 'react';
import { Handle, Position, getOutgoers, useReactFlow } from 'react-flow-renderer';
import { ChannelButton } from '../../../design-system';

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
  active: boolean;
}

export default memo(
  ({ data, selected, id, dragging }: { data: NodeData; selected: boolean; id: string; dragging: boolean }) => {
    const { getNode, getEdges, getNodes } = useReactFlow();
    const thisNode = getNode(id);
    const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
    const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };

    return (
      <div data-test-id={`node-${data.testId}`} style={{ pointerEvents: 'none' }}>
        <ChannelButton
          setActivePage={data.setActivePage}
          errors={data.error}
          onDelete={data.onDelete}
          tabKey={data.tabKey}
          Icon={data.Icon}
          label={data.label}
          active={selected}
          disabled={!data.active}
          id={id}
          dragging={dragging}
        />
        <Handle type="target" id="b" position={Position.Top} />
        <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
      </div>
    );
  }
);
