import { CustomSmsProvider } from '@novu/custom-sms';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class CustomSmsHandler extends BaseSmsHandler {
  constructor() {
    super('custom-sms', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new CustomSmsProvider({
      baseUrl: credentials.baseUrl,
      apiKey: credentials.apiKey,
      secretKey: credentials.secretKey,
      from: credentials.from,
      apiKeyRequestHeader: credentials.apiKeyRequestHeader,
      secretKeyRequestHeader: credentials.secretKeyRequestHeader,
      idPath: credentials.idPath,
      datePath: credentials.datePath,
    });
  }
}
