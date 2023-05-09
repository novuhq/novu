import { Handle, Position } from 'react-flow-renderer';

import { NodeStepWithPopover } from './NodeStepWithPopover';
import { TurnOnGradient } from '../../../design-system/icons/gradient/TurnOnGradient';
import { Button } from '../../../design-system';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';

export function TriggerNode({ data, id }: { data: any; id: string }) {
  const { isReadOnly, runTrigger } = useDigestDemoFlowContext();

  return (
    <NodeStepWithPopover
      data={data}
      id={id}
      Icon={TurnOnGradient}
      ActionItem={
        !isReadOnly && (
          <Button variant="outline" onClick={runTrigger}>
            Run Trigger
          </Button>
        )
      }
      Handlers={() => {
        return (
          <>
            <Handle type="source" id="a" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
}
