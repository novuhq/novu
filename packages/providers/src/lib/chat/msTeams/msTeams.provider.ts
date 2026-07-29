import { ChatProviderIdEnum } from '@novu/shared';
import {
  CardElement,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  IChatRenderResult,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
  MsTeamsChannelData,
  MsTeamsUserData,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { esmImport } from '../../../utils/esm-import';
import { safeChatWebhookJsonRequest } from '../../../utils/safe-chat-webhook-request';
import { WithPassthrough } from '../../../utils/types';
import { toTeamsFlavoredCard, validateTeamsCard } from './card-render.utils';

interface CreateConversationResponse {
  id: string;
  serviceUrl?: string;
  activityId?: string;
}

type TeamsCardsModule = {
  cardToAdaptiveCard: (card: unknown) => Record<string, unknown>;
  cardToFallbackText: (card: unknown) => string;
};

const ADAPTIVE_CARD_CONTENT_TYPE = 'application/vnd.microsoft.card.adaptive';

export class MsTeamsProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.MsTeams;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  private axiosInstance: AxiosInstance = axios.create();

  private static readonly BOT_FRAMEWORK_SERVICE_URL = 'https://smba.trafficmanager.net';

  constructor(private config) {
    super();
  }

  /**
   * Rich Chat: serialize a `CardElement` to a Teams Adaptive Card attachment + fallback text.
   */
  async render(card: CardElement): Promise<IChatRenderResult> {
    const { cardToAdaptiveCard, cardToFallbackText } = await esmImport<TeamsCardsModule>('@chat-adapter/teams');

    // Teams Adaptive Card TextBlocks render standard markdown for bold/italic/links, but not
    // strikethrough or inline code — strip those markers so they don't show as literal `~~`/backticks.
    const teamsCard = toTeamsFlavoredCard(card);

    return {
      nativePayload: {
        attachments: [{ contentType: ADAPTIVE_CARD_CONTENT_TYPE, content: cardToAdaptiveCard(teamsCard) }],
      },
      content: cardToFallbackText(teamsCard),
      validation: validateTeamsCard(card),
    };
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { channelData } = data;

    if (!channelData) {
      throw new Error('Channel data is required for MS Teams provider');
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBHOOK)) {
      return await this.sendWebhookMessage(channelData.endpoint.url, data, bridgeProviderData);
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_CHANNEL)) {
      return await this.sendChannelMessage(channelData, data);
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_USER)) {
      return await this.sendUserMessage(channelData, data);
    }

    throw new Error(`Invalid channel data type for MsTeams provider`);
  }

  private async sendWebhookMessage(
    webhookUrl: string,
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<ISendMessageSuccessResponse> {
    let payload: Record<string, unknown>;

    if (data.nativePayload) {
      payload = { type: 'message', ...data.nativePayload };
    } else {
      try {
        payload = { ...JSON.parse(data.content) };
      } catch {
        payload = { text: data.content };
      }
    }

    payload = this.transform(bridgeProviderData, payload).body;

    const response = await safeChatWebhookJsonRequest({
      url: webhookUrl,
      body: payload,
    });

    return {
      id: (response.headers['request-id'] as string) || `webhook-${Date.now()}`,
      date: new Date().toISOString(),
    };
  }

  private async sendChannelMessage(
    channelData: MsTeamsChannelData,
    data: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { endpoint, subscriberTenantId, token } = channelData;
    const { teamId, channelId } = endpoint;

    const payload = {
      type: 'message',
      ...(data.nativePayload ?? { text: data.content }),
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

  private async sendUserMessage(
    channelData: MsTeamsUserData,
    data: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
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
        ...(data.nativePayload ?? { text: data.content }),
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
    if (
      errorCode === 'BotNotInConversationRoster' ||
      errorMessage.includes('BotNotInConversationRoster') ||
      errorMessage.includes('Bot is not installed in user') ||
      errorMessage.toLowerCase().includes('not installed')
    ) {
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
