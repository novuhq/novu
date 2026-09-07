import { IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { CardElement, IChatOptions, IChatRenderValidation, ISendMessageSuccessResponse } from '@novu/stateless';
import { IHandler } from '../../shared/interfaces';

/**
 * Rich Chat: a `CardElement` resolved into transport-ready fields for a specific provider.
 * `nativePayload` is the provider-native payload (Slack `{ blocks }`, Teams `{ attachments }`),
 * absent when the provider has no native `render()` and the card was degraded into `content`.
 */
export type ResolvedChatCard = {
  content: string;
  nativePayload?: Record<string, unknown>;
  validation: IChatRenderValidation[];
};

export interface IChatHandler extends IHandler {
  canHandle(providerId: string, channelType: ChannelTypeEnum);
  buildProvider(credentials: ICredentials);
  send(chatData: IChatOptions): Promise<ISendMessageSuccessResponse>;
  /**
   * Rich Chat: resolve a `CardElement` into transport-ready `content` + native `nativePayload`
   * for this provider (native render for rich providers, markdown degradation otherwise).
   */
  resolveCardContent(card: CardElement): Promise<ResolvedChatCard>;
}

export interface IChatFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>
  ): IChatHandler | null;
}
