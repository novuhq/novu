import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { NtfyPushProvider } from '@novu/ntfy';
import { BasePushHandler } from './base.handler';

export class NtfyHandler extends BasePushHandler {
  constructor() {
    super('ntfy', ChannelTypeEnum.PUSH);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.baseUrl || !credentials.topic) {
      throw Error('Config is not valid for ntfy');
    }

    this.provider = new NtfyPushProvider({
      baseUrl: credentials.baseUrl,
      topic: credentials.topic,
    });
  }
}
