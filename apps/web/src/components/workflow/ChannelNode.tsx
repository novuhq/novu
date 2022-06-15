import React, { memo, useCallback } from 'react';
import { Handle, Position, useStore } from 'react-flow-renderer';
import { ChannelButton } from '../../design-system';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
  tabKey: string;
  index: number;
  testId: string;
  onDelete: () => void;
  showDropZone: boolean;
  error: string;
}

export default memo(({ data, selected, id }: { data: NodeData; selected: boolean; id: string }) => {
  const targetNode = useStore(useCallback((store) => store.nodeInternals.get(id), [id]));
  const noChildStyle = typeof targetNode?.isParent === 'undefined' ? { border: 'none', background: 'transparent' } : {};

  return (
    <div data-test-id={`node-${data.testId}`} style={{ pointerEvents: 'none' }}>
      <ChannelButton
        showDropZone={data.showDropZone}
        errors={data.error}
        onDelete={data.onDelete}
        Icon={data.Icon}
        label={data.label}
        active={selected}
        id={id}
      />
      <Handle type="target" id="b" position={Position.Top} />
      <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
