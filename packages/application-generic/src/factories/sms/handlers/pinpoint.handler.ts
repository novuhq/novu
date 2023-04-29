import { ChannelTypeEnum } from '@novu/shared';
import { PinpointSMSProvider } from '@novu/pinpoint';
import { ICredentials } from '@novu/dal';
import { BaseSmsHandler } from './base.handler';

export class PinpointHandler extends BaseSmsHandler {
  constructor() {
    super('sns', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new PinpointSMSProvider({
      from: credentials.from,
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.secretKey,
      region: credentials.region,
    });
  }
}
