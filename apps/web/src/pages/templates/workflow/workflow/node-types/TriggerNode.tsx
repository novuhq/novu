import { StepTypeEnum } from '@novu/shared';
import { memo } from 'react';
import { Handle, Position, useReactFlow } from 'react-flow-renderer';

import { WorkflowNode } from './WorkflowNode';
import { TapeGradient } from '../../../../../design-system/icons';

export default memo(({ selected }: { selected: boolean }) => {
  const { getNodes } = useReactFlow();
  const isParent = getNodes().length > 2;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };

  return (
    <div data-test-id={`node-triggerSelector`} style={{ pointerEvents: 'none' }}>
      <WorkflowNode
        showDots={false}
        Icon={TapeGradient}
        label={'Trigger'}
        active={selected}
        channelType={StepTypeEnum.TRIGGER}
      />
      <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
