import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from 'react-flow-renderer';
import { ChannelButton } from '../../../design-system';
import { TapeGradient } from '../../../design-system/icons';

interface ITriggerNodeData {
  showDropZone: boolean;
}

export default memo(({ selected, data }: { selected: boolean; data: ITriggerNodeData }) => {
  const { getNodes } = useReactFlow();
  const isParent = getNodes().length > 2;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };

  return (
    <div data-test-id={`node-triggerSelector`} style={{ pointerEvents: 'none' }}>
      <ChannelButton
        showDropZone={data.showDropZone}
        tabKey=""
        showDots={false}
        Icon={TapeGradient}
        label={'Trigger'}
        active={selected}
      />
      <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
