import React, { memo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { ChannelButton } from '../../design-system';
import { TapeGradient } from '../../design-system/icons';

export default memo(({ selected, data }: { selected: boolean; data: { templateId: string } }) => {
  return (
    <div data-test-id={`node-triggerSelector`} style={{ pointerEvents: 'none' }}>
      <ChannelButton
        templateId={data.templateId}
        showDots={false}
        Icon={TapeGradient}
        label={'Trigger'}
        active={selected}
      />
      <Handle type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
