import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

import { NodeStep } from './NodeStep';
import { MailGradient } from '../../../../../design-system/icons';
import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';
import { colors } from '../../../../../design-system';

export function EmailNode({ data, id }: { data: any; id: string }) {
  const { theme } = useStyles();
  const ActionItem = data.ActionItem as React.FC<any>;

  return (
    <NodeStep
      data={data}
      id={id}
      Icon={MailGradient}
      ActionItem={() => <ActionItem style={{ color: `${theme.colorScheme === 'dark' ? colors.B40 : colors.B80}` }} />}
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
