import { Handle, Position } from 'react-flow-renderer';

import { EmailFilled } from '@novu/design-system';
import { NodeStepWithPopover } from './NodeStepWithPopover';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';
import { Indicator } from './Indicator';
import { useAuth } from '../../../hooks/useAuth';

export function EmailNode({ data, id }: { data: any; id: string }) {
  const { currentUser } = useAuth();
  const { isReadOnly, emailsSentCount } = useDigestDemoFlowContext();
  // eslint-disable-next-line no-param-reassign
  data.email = currentUser?.email ?? '';

  return (
    <NodeStepWithPopover
      data={data}
      id={id}
      Icon={EmailFilled}
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
