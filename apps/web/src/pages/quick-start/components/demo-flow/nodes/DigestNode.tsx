import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { NodeButton } from './NodeButton';
import { DigestGradient } from '../../../../../design-system/icons/general/DigestGradient';

export function DigestNode({ data, id }: { data: any; id: string }) {
  return (
    <>
      <NodeButton
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
    </>
  );
}
