import { PusherBeamsPushProvider } from '@novu/providers';
import {
  ChannelTypeEnum,
  ICredentials,
  PushProviderIdEnum,
} from '@novu/shared';
import { BasePushHandler } from './base.handler';

export class PusherBeamsHandler extends BasePushHandler {
  constructor() {
    super(PushProviderIdEnum.PusherBeams, ChannelTypeEnum.PUSH);
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
