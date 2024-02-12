import { ChannelTypeEnum } from '@novu/shared';

import { MobileSimulator } from '../common';
import Content from './Content';

export function PushPreview() {
  return (
    <div>
      <MobileSimulator channel={ChannelTypeEnum.PUSH}>
        <Content />
      </MobileSimulator>
    </div>
  );
}
