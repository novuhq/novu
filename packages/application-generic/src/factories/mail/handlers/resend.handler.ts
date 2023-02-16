import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { ResendEmailProvider } from '@novu/resend';
import { BaseHandler } from './base.handler';

export class ResendHandler extends BaseHandler {
  constructor() {
    super('resend', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    const config: { apiKey: string; from: string } = {
      from: from as string,
      apiKey: credentials.apiKey as string,
    };

    this.provider = new ResendEmailProvider(config);
  }
}
