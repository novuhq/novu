import { PusherBeamsPushProvider } from '@novu/pusher-beams';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BasePushHandler } from './base.handler';

export class PusherBeamsHandler extends BasePushHandler {
  constructor() {
    super('pusher-beams', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.instanceId || !credentials.secretKey) {
      throw Error('Config is not valid for Pusher Beams');
    }

    this.provider = new PusherBeamsPushProvider({
      instanceId: credentials.instanceId,
      secretKey: credentials.secretKey,
    });
  }
}
