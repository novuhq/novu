import { ICredentials } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { WhatsappBusinessChatProvider } from '@novu/whatsapp-business';

export class WhatsappBusinessHandler extends BaseChatHandler {
  constructor() {
    super('whatsapp', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
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
