import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import Axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { WhatsAppMessageTypeEnum } from './consts/whatsapp-business.enum';
import { ISendMessageRes } from './types/whatsapp-business.types';

export class WhatsappBusinessChatProvider
  extends BaseProvider
  implements IChatProvider
{
  id = ChatProviderIdEnum.WhatsAppBusiness;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private readonly axiosClient: AxiosInstance;
  private readonly baseUrl = 'https://graph.facebook.com/v18.0/';

  constructor(
    private config: {
      accessToken: string;
      phoneNumberIdentification: string;
    },
  ) {
    super();
    this.axiosClient = Axios.create({
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(
      bridgeProviderData,
      this.defineMessagePayload(options),
    ).body;

    const { data } = await this.axiosClient.post<ISendMessageRes>(
      `${this.baseUrl + this.config.phoneNumberIdentification}/messages`,
      payload,
    );

    return {
      id: data.messages[0].id,
      date: new Date().toISOString(),
    };
  }

  private defineMessagePayload(options: IChatOptions) {
    const type = this.defineMessageType(options);

    const basePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: options.phoneNumber,
      type,
    };

    if (type === WhatsAppMessageTypeEnum.TEMPLATE) {
      const templateData = options.customData?.template;

      return { ...basePayload, template: templateData };
    }

    return {
      ...basePayload,
      text: { body: options.content, preview_url: false },
    };
  }

  private defineMessageType(options: IChatOptions): WhatsAppMessageTypeEnum {
    return options.customData &&
      Object.keys(options.customData).some((key) => key === 'template')
      ? WhatsAppMessageTypeEnum.TEMPLATE
      : WhatsAppMessageTypeEnum.TEXT;
  }
}
