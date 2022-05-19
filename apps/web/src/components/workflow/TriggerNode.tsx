import React, { memo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { ChannelButton } from '../../design-system';
import { TapeGradient } from '../../design-system/icons';

export default memo(({ selected }: { selected: boolean }) => {
  return (
    <div style={{ pointerEvents: 'none' }}>
      <ChannelButton
        Icon={TapeGradient}
        description={'bla'}
        label={'Trigger'}
        tabKey={'TriggerSnippet'}
        active={selected}
      />

      <Handle type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
