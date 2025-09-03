import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { IChatOptions, IChatProvider } from '@novu/stateless';
import { BaseHandler } from '../../shared/interfaces';
import { IChatHandler } from '../interfaces';

export abstract class BaseChatHandler extends BaseHandler implements IChatHandler {
  protected provider: IChatProvider;

  protected constructor(
    private providerId: ChatProviderIdEnum,
    private channelType: string
  ) {
    super();
  }

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  abstract buildProvider(credentials);

  async send(chatContent: IChatOptions) {
    if (process.env.NODE_ENV === 'test') {
      return {};
    }

    const { bridgeProviderData, ...content } = chatContent;

    return await this.provider.sendMessage(content, bridgeProviderData);
  }
}
