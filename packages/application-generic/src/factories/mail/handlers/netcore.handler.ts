import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { NetCoreProvider } from '@novu/netcore';
import { BaseHandler } from './base.handler';

export class NetCoreHandler extends BaseHandler {
  constructor() {
    super('netcore', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; from: string; senderName: string } = {
      apiKey: credentials.apiKey,
      from: from as string,
      senderName: credentials.senderName,
    };

    this.provider = new NetCoreProvider(config);
  }
}
