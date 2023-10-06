import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { WhatsappBusinessChatProvider } from '@novu/whatsapp-business';

export class WhatsappBusinessHandler extends BaseChatHandler {
  constructor() {
    super('whatsapp-business', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    const config: {
      apiKey: string;
      apiVersion: string;
      applicationId: string;
    } = {
      apiKey: credentials.apiKey,
      apiVersion: credentials.apiVersion,
      applicationId: credentials.applicationId,
    };

    this.provider = new WhatsappBusinessChatProvider(config);
  }
}
