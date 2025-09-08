import { NetCoreProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class NetCoreHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.NetCore, ChannelTypeEnum.EMAIL);
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
