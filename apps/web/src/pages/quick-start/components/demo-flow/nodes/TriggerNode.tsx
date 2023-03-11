import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { NodeButton } from './NodeButton';
import { TurnOnGradient } from '../../../../../design-system/icons/gradient/TurnOnGradient';

export function TriggerNode({ data, id }: { data: any; id: string }) {
  return (
    <NodeButton
      data={data}
      id={id}
      Icon={TurnOnGradient}
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
