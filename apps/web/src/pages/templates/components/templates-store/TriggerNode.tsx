import { Handle, NodeProps, Position } from 'react-flow-renderer';

import { NodeStep } from '../../../../components/workflow';
import { TurnOnGradient } from '../../../../design-system/icons';

export const TriggerNode = ({ data }: NodeProps) => {
  return (
    <NodeStep
      data={data}
      Icon={TurnOnGradient}
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
