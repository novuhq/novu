import { Handle, Position } from 'react-flow-renderer';

import { NodeStep } from './NodeStep';
import { MailGradient } from '../../design-system/icons';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';
import { Indicator } from './Indicator';
import { useAuthContext } from '../providers/AuthProvider';

export function EmailNode({ data, id }: { data: any; id: string }) {
  const { currentUser } = useAuthContext();
  const { isReadOnly, emailsSentCount } = useDigestDemoFlowContext();
  data.email = currentUser?.email ?? '';

  return (
    <NodeStep
      data={data}
      id={id}
      Icon={MailGradient}
      ContentItem={
        !isReadOnly && (
          <>
            <Indicator isShown={emailsSentCount > 0} value={emailsSentCount > 99 ? '99' : `${emailsSentCount}`} />
          </>
        )
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
