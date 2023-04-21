import { Handle, Position } from 'react-flow-renderer';

import { TurnOnGradient } from '../../../design-system/icons/gradient/TurnOnGradient';

import { NodeStep } from '../common';

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
