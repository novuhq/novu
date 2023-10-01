import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { ResendEmailProvider } from '@novu/resend';
import { BaseHandler } from './base.handler';

export class ResendHandler extends BaseHandler {
  constructor() {
    super('resend', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string, senderName?: string) {
    const modifiedFrom = senderName ? `${senderName} <${from}>` : from;
    const config: { apiKey: string; from: string } = {
      //from: from as string,
      from: modifiedFrom as string,
      apiKey: credentials.apiKey as string,
    };

    this.provider = new ResendEmailProvider(config);
  }
}
