import React, { memo, useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { ChannelButton, colors, TemplateButton } from '../../design-system';
import { MobileGradient } from '../../design-system/icons';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
}
export default memo(({ data, selected }: { data: NodeData; selected: boolean }) => {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('selected', selected);
  }, [selected]);

  return (
    <div style={{ pointerEvents: 'none' }}>
      <ChannelButton
        Icon={data.Icon}
        description={data.description}
        label={data.label}
        active={selected}
        tabKey={'bla'}
        changeTab={() => {}}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'transparent', border: `1px solid ${colors.B40}` }}
        onConnect={(params) => {
          // eslint-disable-next-line no-console
          console.log('handle onConnect', params);
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'transparent', border: `1px solid ${colors.B40}` }}
        onConnect={(params) => {
          // eslint-disable-next-line no-console
          console.log('handle onConnect', params);
        }}
      />
    </div>
  );
});
