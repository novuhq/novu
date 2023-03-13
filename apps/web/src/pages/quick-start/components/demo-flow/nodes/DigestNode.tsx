import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { NodeStep } from './NodeStep';
import { DigestGradient } from '../../../../../design-system/icons/general/DigestGradient';

export function DigestNode({ data, id }: { data: any; id: string }) {
  return (
    <NodeStep
      data={data}
      id={id}
      Icon={DigestGradient}
      Handlers={() => {
        return (
          <>
            <Handle type="target" id="b" position={Position.Top} />
            <Handle type="source" id="a" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
}
