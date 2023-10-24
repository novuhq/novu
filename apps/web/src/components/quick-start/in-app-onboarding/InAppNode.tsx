import { Handle, Position } from 'react-flow-renderer';
import { InAppFilled } from '@novu/design-system';
import { NodeStep } from '../../workflow';

export function InAppNode({ data }: { data: { label: string; email?: string } }) {
  return (
    <NodeStep
      data={data}
      Icon={InAppFilled}
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
