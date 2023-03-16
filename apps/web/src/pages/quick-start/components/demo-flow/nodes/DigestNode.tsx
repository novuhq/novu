import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { NodeStep } from './NodeStep';
import { DigestGradient } from '../../../../../design-system/icons';
import { colors } from '../../../../../design-system';
import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';

export function DigestNode({ data, id }: { data: any; id: string }) {
  const { theme } = useStyles();
  const ActionItem = data.ActionItem as React.FC<any>;

  return (
    <NodeStep
      data={data}
      id={id}
      Icon={DigestGradient}
      ActionItem={<ActionItem style={{ color: `${theme.colorScheme === 'dark' ? colors.B40 : colors.B80}` }} />}
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
