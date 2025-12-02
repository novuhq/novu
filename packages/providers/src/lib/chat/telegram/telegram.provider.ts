import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from "@novu/stateless";
import { BaseProvider, CasingEnum } from "../../../base.provider";
import { WithPassthrough } from "../../../utils/types";
import { ChatProviderIdEnum } from "@novu/shared";
import axios from "axios";

export class TelegramChatProvider
  extends BaseProvider
  implements IChatProvider
{
  public id = ChatProviderIdEnum.Telegram;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  private axiosInstance = axios.create();

  constructor(private config: { token: string }) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    // @ts-ignore
    const chatId = options.channelData.endpoint.url;
    const data = this.transform(bridgeProviderData, {
      content: options.content,
    })

    if (!chatId) throw new Error('Chat ID is missing');

    const response = await this.axiosInstance.post(`https://api.telegram.org/bot${this.config.token}/sendMessage`, {
      chat_id: chatId,
      text: data.body.content
    });

    return {
      id: response.data.result.message_id.toString(),
      date: new Date(response.data.result.date * 1000).toISOString(),
    };
  }
}
