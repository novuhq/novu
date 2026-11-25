import { cardToFallbackMarkdown } from '@novu/providers';
import { ChatProviderIdEnum } from '@novu/shared';
import {
  CardElement,
  IChatFileDeliveryResult,
  IChatOptions,
  IChatProvider,
  IChatSendFilesOptions,
} from '@novu/stateless';
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

  async sendFiles(options: IChatSendFilesOptions): Promise<IChatFileDeliveryResult[] | null> {
    if (!this.provider.sendFiles) {
      return null;
    }

    // Mirrors `send`: suites never reach a provider API.
    if (process.env.NODE_ENV === 'test') {
      return options.files.map((file) => ({ name: file.name, status: 'sent' }));
    }

    return await this.provider.sendFiles(options);
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
