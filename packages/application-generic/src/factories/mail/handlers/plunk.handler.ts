import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { PlunkEmailProvider } from '@novu/plunk';
import { BaseHandler } from './base.handler';

export class PlunkHandler extends BaseHandler {
  constructor() {
    super('plunk', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials) {
    const config: { apiKey: string; senderName: string } = {
      apiKey: credentials.apiKey,
      senderName: credentials.senderName,
    };

    this.provider = new PlunkEmailProvider(config);
  }
}
