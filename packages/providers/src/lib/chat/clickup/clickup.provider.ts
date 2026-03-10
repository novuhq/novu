import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ClickUpChannelData,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

const DEFAULT_CHANNEL_MESSAGE_PAYLOAD_TYPE = 'message';
const DEFAULT_CHANNEL_MESSAGE_PAYLOAD_CONTENT_FORMAT = 'text/md';

interface IClickUpConfig {
  apiKey: string;
}

export class ClickUpProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.ClickUp;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  private axiosInstance: AxiosInstance;
  private static readonly BASE_URL = 'https://api.clickup.com/api/v3';

  constructor(private config: IClickUpConfig) {
    super();
    this.axiosInstance = axios.create({
      baseURL: ClickUpProvider.BASE_URL,
      timeout: 10_000,
      headers: {
        Authorization: this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!data.channelData || !isChannelDataOfType(data.channelData, ENDPOINT_TYPES.CLICKUP_CHANNEL)) {
      throw new Error('ClickUp provider requires channelData of type clickup_channel');
    }

    const response = await this.sendChannelMessage(data, data.channelData, bridgeProviderData);

    if (!response.data.ok) {
      throw new Error(`ClickUp API Error: ${response.data.error}`);
    }

    return {
      id: response.data.id,
      date: new Date().toISOString(),
    };
  }

  private async sendChannelMessage(
    data: IChatOptions,
    channelData: ClickUpChannelData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ) {
    const { workspaceId, channelId } = channelData.endpoint;

    const payload = this.transform(bridgeProviderData, {
      type: DEFAULT_CHANNEL_MESSAGE_PAYLOAD_TYPE,
      content: data.content,
      content_format: DEFAULT_CHANNEL_MESSAGE_PAYLOAD_CONTENT_FORMAT,
      ...(data.customData || {}),
    }).body;

    const response = await this.axiosInstance.post(
      `/workspaces/${workspaceId}/chat/channels/${channelId}/messages`,
      payload
    );

    return response;
  }
}
