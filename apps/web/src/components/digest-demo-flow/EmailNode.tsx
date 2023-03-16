import { Handle, Position } from 'react-flow-renderer';
import styled from '@emotion/styled';

import { NodeStep } from './NodeStep';
import { MailGradient } from '../../design-system/icons';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';
import { Indicator } from './Indicator';
import { useAuthContext } from '../providers/AuthProvider';

const Email = styled.span`
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 180%);
`;

export function EmailNode({ data, id }: { data: any; id: string }) {
  const { currentUser } = useAuthContext();
  const { isReadOnly, emailsSentCount } = useDigestDemoFlowContext();

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
