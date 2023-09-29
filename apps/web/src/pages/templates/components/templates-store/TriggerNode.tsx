import { Handle, NodeProps, Position } from 'react-flow-renderer';

import { NodeStep } from '../../../../components/workflow';
import { BoltOutlinedGradient } from '../../../../design-system/icons';

export const TriggerNode = ({ data }: NodeProps) => {
  return (
    <NodeStep
      data={data}
      Icon={BoltOutlinedGradient}
      Handlers={() => {
        return (
          <>
            <Handle type="source" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
};
