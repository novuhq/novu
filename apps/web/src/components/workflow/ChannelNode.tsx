import React, { memo, useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { ChannelButton, colors } from '../../design-system';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
  tabKey: string;
  changeTab: (string) => void;
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
        position={Position.Top}
        style={{ background: 'transparent', border: `1px solid ${colors.B40}` }}
        onConnect={(params) => {}}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'transparent', border: `1px solid ${colors.B40}` }}
        onConnect={(params) => {}}
      />
    </div>
  );
});
