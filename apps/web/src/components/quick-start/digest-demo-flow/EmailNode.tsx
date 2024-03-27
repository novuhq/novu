import { Handle, Position } from 'react-flow-renderer';

import { NodeStepWithPopover } from './NodeStepWithPopover';
import { EmailFilled } from '@novu/design-system';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';
import { Indicator } from './Indicator';
import { useAuthContext } from '../../providers/AuthProvider';

export function EmailNode({ data, id }: { data: any; id: string }) {
  const { currentUser } = useAuthContext();
  const { isReadOnly, emailsSentCount } = useDigestDemoFlowContext();
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
