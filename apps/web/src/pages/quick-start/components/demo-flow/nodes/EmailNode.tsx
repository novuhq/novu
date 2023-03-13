import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { NodeStep } from './NodeStep';
import { MailGradient } from '../../../../../design-system/icons';

export function EmailNode({ data, id }: { data: any; id: string }) {
  return (
    <NodeStep
      data={data}
      id={id}
      Icon={MailGradient}
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
