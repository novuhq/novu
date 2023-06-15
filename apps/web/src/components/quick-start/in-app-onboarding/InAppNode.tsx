import { Handle, Position } from 'reactflow';

import { TurnOnGradient } from '../../../design-system/icons';
import { NodeStep } from '../../workflow';

export function InAppNode({ data }: { data: { label: string; email?: string } }) {
  return (
    <NodeStep
      data={data}
      Icon={TurnOnGradient}
      Handlers={() => {
        return (
          <>
            <Handle type="target" id="b" position={Position.Top} />
          </>
        );
      }}
    />
  );
}
