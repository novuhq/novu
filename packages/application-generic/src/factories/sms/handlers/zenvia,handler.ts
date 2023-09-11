import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { ZenviaProvider } from '@novu/zenvia';

export class ZenviaHandler extends BaseSmsHandler {
  constructor() {
    super('zenvia', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new ZenviaProvider({
      apiKey: credentials.apiKey,
    });
  }
}