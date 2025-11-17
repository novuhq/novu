import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IChatOptions,
  IChatProvider,
} from "@novu/stateless";
import { BaseProvider, CasingEnum } from "../../../base.provider";
import { WithPassthrough } from "../../../utils/types";
import { ChatProviderIdEnum } from "@novu/shared";

export class TelegramChatProvider
  extends BaseProvider
  implements IChatProvider
{
  public id = ChatProviderIdEnum.Telegram;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  constructor(private config: { token: string }) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, options);

    return {
      id: "id_returned_by_provider",
      date: "current_time",
    };
  }
}
