import { ChatProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, IChatOptions, IChatProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface IClickUpConfig {
  apiKey: string;
}

export class ClickUpProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.ClickUp;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  private axiosInstance: AxiosInstance;
  private static readonly BASE_URL = 'https://api.clickup.com/api/v2';

  constructor(private config: IClickUpConfig) {
    super();
    this.axiosInstance = axios.create({
      baseURL: ClickUpProvider.BASE_URL,
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
    const taskId = data.customData?.taskId as string | undefined;
    const listId = data.customData?.listId as string | undefined;

    if (taskId) {
      return this.createTaskComment(taskId, data.content, bridgeProviderData);
    }

    if (listId) {
      return this.createTask(listId, data.content, bridgeProviderData);
    }

    throw new Error('ClickUp provider requires either taskId or listId in customData');
  }

  private async createTaskComment(
    taskId: string,
    content: string,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      comment_text: content,
      notify_all: true,
    }).body;

    const response = await this.axiosInstance.post(`/task/${taskId}/comment`, payload);

    return {
      id: String(response.data.id),
      date: new Date().toISOString(),
    };
  }

  private async createTask(
    listId: string,
    content: string,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      name: content.substring(0, 200),
      markdown_description: content,
      notify_all: true,
    }).body;

    const response = await this.axiosInstance.post(`/list/${listId}/task`, payload);

    return {
      id: response.data.id,
      date: new Date(Number(response.data.date_created)).toISOString(),
    };
  }
}
