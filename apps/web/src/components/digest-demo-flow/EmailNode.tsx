import React from 'react';
import { Handle, Position } from 'react-flow-renderer';
import styled from '@emotion/styled';
import { useMantineTheme } from '@mantine/core';

import { NodeStep } from './NodeStep';
import { MailGradient } from '../../design-system/icons';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';
import { Indicator } from './Indicator';
import { useAuthContext } from '../providers/AuthProvider';
import { colors } from '../../design-system';

const Email = styled.span`
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 180%);
`;

export function EmailNode({ data, id }: { data: any; id: string }) {
  const { currentUser } = useAuthContext();
  const { isReadOnly, emailsSentCount } = useDigestDemoFlowContext();
  const { colorScheme } = useMantineTheme();
  const ActionItem = data.ActionItem as React.FC<any>;

  return (
    <NodeStep
      data={data}
      id={id}
      Icon={MailGradient}
      ContentItem={
        <>
          <Indicator
            isShown={!isReadOnly && emailsSentCount > 0}
            value={emailsSentCount > 99 ? '99' : `${emailsSentCount}`}
          />
          <Email>{currentUser?.email ?? ''}</Email>
        </>
      }
      ActionItem={<ActionItem style={{ color: `${colorScheme === 'dark' ? colors.B40 : colors.B80}` }} />}
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
