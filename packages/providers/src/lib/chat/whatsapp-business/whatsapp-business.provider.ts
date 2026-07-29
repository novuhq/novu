import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import {
  CardElement,
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  IChatRenderResult,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import Axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { cardToWhatsAppText } from './card-render.utils';
import { WhatsAppMessageTypeEnum } from './consts/whatsapp-business.enum';
import { ISendMessageRes } from './types/whatsapp-business.types';

export class WhatsappBusinessChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.WhatsAppBusiness;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private readonly axiosClient: AxiosInstance;
  private readonly baseUrl = 'https://graph.facebook.com/v22.0/';

  constructor(
    private config: {
      accessToken: string;
      phoneNumberIdentification: string;
    }
  ) {
    super();
    this.axiosClient = Axios.create({
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Rich Chat: WhatsApp has no native card payload, so degrade the `CardElement` to WhatsApp-flavored
   * text (`*bold*`, `_italic_`, `~strike~`; links rendered as `label (url)` since it has no link markup).
   */
  async render(card: CardElement): Promise<IChatRenderResult> {
    return {
      nativePayload: {},
      content: cardToWhatsAppText(card),
      validation: [],
    };
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.PHONE)) {
      throw new Error('Invalid channel data for WhatsappBusiness provider');
    }

    const { phoneNumber } = options.channelData.endpoint;

    const payload = this.transform(bridgeProviderData, this.defineMessagePayload(options, phoneNumber)).body;

    const { data } = await this.axiosClient.post<ISendMessageRes>(
      `${this.baseUrl + this.config.phoneNumberIdentification}/messages`,
      payload
    );

    return {
      id: data.messages[0].id,
      date: new Date().toISOString(),
    };
  }

  private defineMessagePayload(options: IChatOptions, phoneNumber: string) {
    const type = this.defineMessageType(options);

    const basePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type,
    };

    // Handle TEXT messages separately (since it's not in `customData`)
    if (type === WhatsAppMessageTypeEnum.TEXT) {
      const textData = options.customData?.text;

      return {
        ...basePayload,
        text: {
          body: textData?.body ?? options.content,
          preview_url: textData?.preview_url ?? false,
        },
      };
    }

    // For all other types, get data from customData
    const payloadData = options.customData?.[type];

    return {
      ...basePayload,
      [type]: payloadData,
    };
  }

  private defineMessageType(options: IChatOptions): WhatsAppMessageTypeEnum {
    const typeKeys: Record<string, WhatsAppMessageTypeEnum> = {
      template: WhatsAppMessageTypeEnum.TEMPLATE,
      interactive: WhatsAppMessageTypeEnum.INTERACTIVE,
      image: WhatsAppMessageTypeEnum.IMAGE,
      document: WhatsAppMessageTypeEnum.DOCUMENT,
      video: WhatsAppMessageTypeEnum.VIDEO,
      audio: WhatsAppMessageTypeEnum.AUDIO,
      location: WhatsAppMessageTypeEnum.LOCATION,
      contacts: WhatsAppMessageTypeEnum.CONTACTS,
      sticker: WhatsAppMessageTypeEnum.STICKER,
    };

    if (options.customData) {
      for (const key of Object.keys(typeKeys)) {
        if (key in options.customData) {
          return typeKeys[key];
        }
      }
    }

    return WhatsAppMessageTypeEnum.TEXT;
  }
}
