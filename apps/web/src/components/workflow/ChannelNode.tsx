import React, { memo, useEffect } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { TemplateButton } from '../../design-system';
import { MobileGradient } from '../../design-system/icons';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
}
export default memo(({ data, selected }: { data: NodeData; selected: boolean }) => {
  useEffect(() => {
    console.log('selected', selected);
  }, [selected]);

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        onConnect={(params) => {
          // eslint-disable-next-line no-console
          console.log('handle onConnect', params);
        }}
      />
      <TemplateButton
        Icon={data.Icon}
        description={data.description}
        label={data.label}
        active={selected}
        tabKey={'bla'}
        changeTab={() => {}}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        onConnect={(params) => {
          // eslint-disable-next-line no-console
          console.log('handle onConnect', params);
        }}
      />
    </>
  );
});
