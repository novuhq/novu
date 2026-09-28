import { PhotonImessageChatProvider } from '@novu/providers';
import { ChannelTypeEnum, ChatProviderIdEnum, IConfigurations, ICredentials } from '@novu/shared';
import { BaseChatHandler } from './base.handler';

export class PhotonImessageHandler extends BaseChatHandler {
  constructor() {
    super(ChatProviderIdEnum.PhotonImessage, ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials & IConfigurations) {
    this.provider = new PhotonImessageChatProvider({
      projectId: credentials.apiKey as string,
      projectSecret: credentials.secretKey as string,
      webhookSigningKey: credentials.inboundWebhookSigningKey,
    });
  }
}
