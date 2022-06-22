import React, { memo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { ChannelButton } from '../../design-system';
import { TapeGradient } from '../../design-system/icons';

interface ITriggerNodeData {
  showDropZone: boolean;
}

export default memo(({ selected, data }: { selected: boolean; data: ITriggerNodeData }) => {
  return (
    <div data-test-id={`node-triggerSelector`} style={{ pointerEvents: 'none' }}>
      <ChannelButton
        showDropZone={data.showDropZone}
        showDots={false}
        Icon={TapeGradient}
        label={'Trigger'}
        active={selected}
      />
      <Handle type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
