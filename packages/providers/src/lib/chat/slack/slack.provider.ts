import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelData,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  SlackChannelData,
  SlackUserData,
  WebhookData,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class SlackProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  public id = ChatProviderIdEnum.Slack;
  private slackAPI = 'https://slack.com/api';
  private axiosInstance = axios.create();

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
    } else {
      if (!response.data.ok) {
        throw new Error(`Slack API Error: ${response.data.error}`);
      }
    }

    return {
      id: response.headers['x-slack-req-id'] || `webhook-id-${Date.now()}`,
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
        blocks: data.blocks,
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
        blocks: data.blocks,
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

    const response = await this.axiosInstance.post(
      endpoint.url,
      this.transform(bridgeProviderData, {
        text: data.content,
        blocks: data.blocks,
        ...(data.customData || {}),
      }).body
    );

    return response;
  }
}
