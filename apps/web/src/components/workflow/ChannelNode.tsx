import React, { memo, useEffect } from 'react';
import { Handle, Position, useNodesState } from 'react-flow-renderer';
import { ChannelButton, colors } from '../../design-system';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
  tabKey: string;
  changeTab: (string) => void;
  index: number;
}
export default memo(({ data, selected }: { data: NodeData; selected: boolean }) => {
  useEffect(() => {
    if (selected) {
      // data.changeTab(data.tabKey);
    }
  }, [selected]);

  return (
    <div style={{ pointerEvents: 'none' }}>
      <ChannelButton
        Icon={data.Icon}
        description={data.description}
        label={data.label}
        active={selected}
        tabKey={data.tabKey}
        changeTab={data.changeTab}
      />
      <Handle
        type="target"
        id="b"
        position={data.index % 2 === 0 ? Position.Left : Position.Right}
        style={{ background: 'transparent', border: `1px solid ${colors.B40}` }}
        onConnect={(params) => {}}
      />
      <Handle
        type="source"
        id="a"
        position={Position.Bottom}
        style={{ background: 'transparent', border: `1px solid ${colors.B40}` }}
        onConnect={(params) => {}}
      />
    </div>
  );
});
