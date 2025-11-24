import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
  MsTeamsChannelData,
  MsTeamsUserData,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface CreateConversationResponse {
  id: string;
  serviceUrl?: string;
  activityId?: string;
}

export class MsTeamsProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.MsTeams;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  private axiosInstance: AxiosInstance = axios.create();

  private static readonly BOT_FRAMEWORK_SERVICE_URL = 'https://smba.trafficmanager.net';

  constructor(private config) {
    super();
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { channelData, content } = data;

    if (!channelData) {
      throw new Error('Channel data is required for MS Teams provider');
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBHOOK)) {
      return await this.sendWebhookMessage(channelData.endpoint.url, content, bridgeProviderData);
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_CHANNEL)) {
      return await this.sendChannelMessage(channelData, content);
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_USER)) {
      return await this.sendUserMessage(channelData, content);
    }

    throw new Error(`Invalid channel data type for MsTeams provider`);
  }

  private async sendWebhookMessage(
    webhookUrl: string,
    content: string,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<ISendMessageSuccessResponse> {
    let payload: Record<string, unknown>;

    try {
      payload = { ...JSON.parse(content) };
    } catch {
      payload = { text: content };
    }

    payload = this.transform(bridgeProviderData, payload).body;

    const response = await this.axiosInstance.post(webhookUrl, payload);

    return {
      id: response.headers['request-id'] || `webhook-${Date.now()}`,
      date: new Date().toISOString(),
    };
  }

  private async sendChannelMessage(
    channelData: MsTeamsChannelData,
    content: string
  ): Promise<ISendMessageSuccessResponse> {
    const { endpoint, subscriberTenantId, token } = channelData;
    const { teamId, channelId } = endpoint;

    const payload = {
      type: 'message',
      text: content,
      channelData: {
        tenant: { id: subscriberTenantId },
        team: { id: teamId },
        channel: { id: channelId },
      },
    };

    try {
      const response = await this.axiosInstance.post(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations/${encodeURIComponent(channelId)}/activities`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.id || `channel-${Date.now()}`,
        date: new Date().toISOString(),
      };
    } catch (error) {
      this.handleBotFrameworkError(error);
      throw error;
    }
  }

  private async sendUserMessage(channelData: MsTeamsUserData, content: string): Promise<ISendMessageSuccessResponse> {
    const { endpoint, subscriberTenantId, token, clientId } = channelData;
    const { userId } = endpoint;

    try {
      // Step 1: Create 1:1 conversation
      const conversationPayload = {
        isGroup: false,
        bot: { id: clientId },
        members: [{ id: userId }],
        channelData: {
          tenant: { id: subscriberTenantId },
        },
      };

      const conversationResponse = await this.axiosInstance.post<CreateConversationResponse>(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations`,
        conversationPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const conversationId = conversationResponse.data.id;

      // Step 2: Send message to the conversation
      const messagePayload = {
        type: 'message',
        text: content,
      };

      const messageResponse = await this.axiosInstance.post(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations/${encodeURIComponent(conversationId)}/activities`,
        messagePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: messageResponse.data.id || `user-${Date.now()}`,
        date: new Date().toISOString(),
      };
    } catch (error) {
      this.handleBotFrameworkError(error);
      throw error;
    }
  }

  private handleBotFrameworkError(error: unknown): void {
    if (!axios.isAxiosError(error) || !error.response) {
      return;
    }

    const status = error.response.status;
    const data = error.response.data;
    const errorCode = data?.error?.code || '';
    const errorMessage = data?.error?.message || data?.message || '';

    // Map Bot Framework errors to descriptive messages
    if (errorCode === 'BotNotInConversationRoster' || errorMessage.includes('BotNotInConversationRoster')) {
      throw new Error('MSTEAMS_BOT_NOT_INSTALLED: Bot is not installed in this team/channel or for this user');
    }

    if (status === 404) {
      throw new Error('MSTEAMS_CHANNEL_NOT_FOUND: Teams channel or user not found');
    }

    if (status === 401) {
      throw new Error('MSTEAMS_INVALID_CREDENTIALS: Invalid bot credentials or token');
    }

    if (status === 403) {
      throw new Error('MSTEAMS_INSUFFICIENT_PERMISSIONS: Insufficient permissions to send message');
    }

    // Generic error
    throw new Error(`MS Teams API Error: ${status} - ${errorMessage || JSON.stringify(data)}`);
  }
}
