import { cardToFallbackMarkdown } from '@novu/providers';
import { ChatProviderIdEnum } from '@novu/shared';
import { CardElement, IChatOptions, IChatProvider } from '@novu/stateless';
import { BaseHandler } from '../../shared/interfaces';
import { IChatHandler, ResolvedChatCard } from '../interfaces';

export abstract class BaseChatHandler extends BaseHandler<IChatProvider> implements IChatHandler {
  protected provider: IChatProvider;

  protected constructor(providerId: ChatProviderIdEnum, channelType: string) {
    super(providerId, channelType);
  }

  abstract buildProvider(credentials);

  async send(chatContent: IChatOptions) {
    if (process.env.NODE_ENV === 'test') {
      return {};
    }

    const { bridgeProviderData, ...content } = chatContent;

    return await this.provider.sendMessage(content, bridgeProviderData);
  }

  async update(chatContent: IChatOptions, identifier: string) {
    if (process.env.NODE_ENV === 'test') {
      return { id: identifier };
    }

    // we don't support updating messages for all providers, so fallback to sending a new message
    if (!this.provider.updateMessage) {
      return await this.send(chatContent);
    }

    const { bridgeProviderData, ...content } = chatContent;

    return await this.provider.updateMessage(content, identifier, bridgeProviderData);
  }

  /**
   * Rich Chat: resolve a `CardElement` into transport-ready fields for this provider.
   * Rich providers (Slack, Teams) serialize it to a native `nativePayload` (+ markdown fallback);
   * providers without a native `render()` degrade to provider-agnostic markdown `content`.
   */
  async resolveCardContent(card: CardElement): Promise<ResolvedChatCard> {
    const rendered = await this.provider.render?.(card);

    if (rendered) {
      return { content: rendered.content, nativePayload: rendered.nativePayload, validation: rendered.validation };
    }

    return { content: cardToFallbackMarkdown(card), validation: [] };
  }
}
