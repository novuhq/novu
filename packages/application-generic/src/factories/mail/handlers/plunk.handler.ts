import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { PlunkEmailProvider } from '@novu/plunk';
import { BaseHandler } from './base.handler';

export class PlunkHandler extends BaseHandler {
  constructor() {
    super('plunk', ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; from: string } = {
      apiKey: credentials.apiKey,
      from,
    };

    this.provider = new PlunkEmailProvider(config);
  }
}
