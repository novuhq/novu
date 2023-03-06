import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { NodeButton } from './NodeButton';
import { MailGradient } from '../../../../../design-system/icons';

export function EmailNode({ data, id }: { data: any; id: string }) {
  return (
    <>
      <NodeButton
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
    </>
  );
}
