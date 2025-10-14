import { MsGraphEmailProvider } from '@novu/providers';
import { ChannelTypeEnum, EmailProviderIdEnum, ICredentials } from '@novu/shared';
import { BaseEmailHandler } from './base.handler';

export class MsGraphHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.MsGraph, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials) {
    const config = {
      clientId: credentials.clientId as string,
      clientSecret: credentials.secretKey as string,
      tenantId: credentials.tenantId as string,
      from: credentials.from as string,
      senderName: credentials.senderName as string,
    };    
    
    this.provider = new MsGraphEmailProvider(config);
  }
}
