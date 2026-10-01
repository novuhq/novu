import { ChatProviderIdEnum } from '@novu/shared';
import {
  CardElement,
  ChannelData,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  IChatRenderResult,
  ISendMessageSuccessResponse,
  SlackChannelData,
  SlackUserData,
  WebhookData,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { esmImport } from '../../../utils/esm-import';
import { createProviderHttpClient } from '../../../utils/http';
import { safeChatWebhookJsonRequest } from '../../../utils/safe-chat-webhook-request';
import { WithPassthrough } from '../../../utils/types';
import { omitIncompleteLinkButtons } from '../card-render.utils';
import { dedupeSlackActionIds, toSlackFlavoredCard, validateSlackCard } from './card-render.utils';

type SlackBlocksModule = {
  cardToBlockKit: (card: unknown) => unknown[];
  cardToFallbackText: (card: unknown) => string;
};

export class SlackProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  public id = ChatProviderIdEnum.Slack;
  private slackAPI = 'https://slack.com/api';
  private axiosInstance = createProviderHttpClient();

  /**
   * Rich Chat: serialize a `CardElement` to Slack Block Kit + mrkdwn fallback text.
   */
  async render(card: CardElement): Promise<IChatRenderResult> {
    const { cardToBlockKit, cardToFallbackText } = await esmImport<SlackBlocksModule>('@chat-adapter/slack');

    // Translate the card's provider-agnostic markdown into Slack mrkdwn (links `<url|label>`,
    // strikethrough `~x~`) before serializing; the adapter only converts `**bold**` on its own.
    // Incomplete Actions (empty URL) stay in the preview card but must not hit Slack.
    const slackCard = toSlackFlavoredCard(omitIncompleteLinkButtons(card));

    return {
      nativePayload: { blocks: dedupeSlackActionIds(cardToBlockKit(slackCard)) },
      content: cardToFallbackText(slackCard),
      validation: validateSlackCard(slackCard),
    };
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.sendMessageToEndpoint(data, data.channelData, bridgeProviderData);

    if (data.channelData.type === ENDPOINT_TYPES.WEBHOOK) {
      // Webhooks return plain text "ok" for success
      if (response.data !== 'ok') {
        throw new Error(`Slack Webhook Error`);
      }

      return {
        id: response.headers['x-slack-req-id'] || `webhook-id-${Date.now()}`,
        date: new Date().toISOString(),
      };
    }

    if (!response.data.ok) {
      throw new Error(`Slack API Error: ${response.data.error}`);
    }

    return {
      id: `${response.data.channel}:${response.data.ts}`,
      date: new Date().toISOString(),
    };
  }

  private sendMessageToEndpoint(
    data: IChatOptions,
    channelData: ChannelData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    switch (channelData.type) {
      case ENDPOINT_TYPES.SLACK_CHANNEL:
        return this.sendAppMessageToChannel(data, channelData, bridgeProviderData);
      case ENDPOINT_TYPES.SLACK_USER:
        return this.sendAppMessageToUser(data, channelData, bridgeProviderData);
      case ENDPOINT_TYPES.WEBHOOK:
        return this.sendIncomingWebhookMessage(data, channelData, bridgeProviderData);
      default:
        throw new Error(`Unsupported endpoint format: ${channelData.type}`);
    }
  }

  private async sendAppMessageToChannel(
    data: IChatOptions,
    channelData: SlackChannelData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    const { endpoint, token } = channelData;

    const response = await this.axiosInstance.post(
      `${this.slackAPI}/chat.postMessage`,
      this.transform(bridgeProviderData, {
        text: data.content,
        ...data.nativePayload,
        channel: endpoint.channelId,
        ...(data.customData || {}),
      }).body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response;
  }

  private async sendAppMessageToUser(
    data: IChatOptions,
    channelData: SlackUserData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    const { endpoint, token } = channelData;

    const response = await this.axiosInstance.post(
      `${this.slackAPI}/chat.postMessage`,
      this.transform(bridgeProviderData, {
        text: data.content,
        ...data.nativePayload,
        channel: endpoint.userId,
        ...(data.customData || {}),
      }).body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response;
  }

  private async sendIncomingWebhookMessage(
    data: IChatOptions,
    channelData: WebhookData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    const { endpoint } = channelData;

    const response = await safeChatWebhookJsonRequest<string>({
      url: endpoint.url,
      body: this.transform(bridgeProviderData, {
        text: data.content,
        ...data.nativePayload,
        ...(data.customData || {}),
      }).body,
    });

    return {
      data: response.body,
      headers: response.headers,
    };
  }
}
