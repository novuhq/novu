import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import Axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
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

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.PHONE)) {
      throw new Error('Invalid channel data for WhatsappBusiness provider');
    }

    const { phoneNumber } = options.channelData.endpoint;

    const merged = this.transform(
      bridgeProviderData,
      this.defineMessagePayload(options, phoneNumber, bridgeProviderData)
    ).body as Record<string, unknown>;

    const payload = this.projectMessagePayload(merged, options, bridgeProviderData);

    const { data } = await this.axiosClient.post<ISendMessageRes>(
      `${this.baseUrl + this.config.phoneNumberIdentification}/messages`,
      payload
    );

    return {
      id: data.messages[0].id,
      date: new Date().toISOString(),
    };
  }

  private defineMessagePayload(
    options: IChatOptions,
    phoneNumber: string,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ) {
    const type = this.defineMessageType(options, bridgeProviderData);

    const basePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type,
    };

    // Emit the default text block only for text messages
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

    // For all other types, get data from customData when present
    const payloadData = options.customData?.[type];

    if (payloadData === undefined) {
      return basePayload;
    }

    return {
      ...basePayload,
      [type]: payloadData,
    };
  }

  /**
   * Project the merged transform body onto a single WhatsApp message shape.
   * Type is resolved from bridge/customData sources (not the merged `type` field alone),
   * so transform key-merges cannot leave a conflicting type + stray sibling bodies.
   */
  private projectMessagePayload(
    merged: Record<string, unknown>,
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ) {
    const type = this.defineMessageType(options, bridgeProviderData);

    const payload: Record<string, unknown> = {
      messaging_product: merged.messaging_product,
      recipient_type: merged.recipient_type,
      to: merged.to,
      type,
    };

    if (type === WhatsAppMessageTypeEnum.TEXT) {
      payload.text = merged.text ?? {
        body: options.content,
        preview_url: false,
      };

      return payload;
    }

    if (merged[type] != null) {
      payload[type] = merged[type];
    }

    return payload;
  }

  private defineMessageType(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): WhatsAppMessageTypeEnum {
    const { _passthrough = {}, ...bridgeData } = bridgeProviderData;
    const passthroughBody = (_passthrough.body || {}) as Record<string, unknown>;

    // Highest priority first — matches transform merge order. Resolve each source
    // fully (explicit type, then typed keys) before falling through to a lower one.
    const sources = [passthroughBody, bridgeData as Record<string, unknown>, options.customData].filter(
      (source): source is Record<string, unknown> => source != null && Object.keys(source).length > 0
    );

    for (const source of sources) {
      const typeFromSource = this.resolveTypeFromSource(source);

      if (typeFromSource) {
        return typeFromSource;
      }
    }

    return WhatsAppMessageTypeEnum.TEXT;
  }

  private resolveTypeFromSource(source: Record<string, unknown>): WhatsAppMessageTypeEnum | undefined {
    if (typeof source.type === 'string' && this.isWhatsAppMessageType(source.type)) {
      return source.type;
    }

    for (const key of Object.values(WhatsAppMessageTypeEnum)) {
      if (key === WhatsAppMessageTypeEnum.TEXT) {
        continue;
      }

      if (key in source) {
        return key;
      }
    }

    return undefined;
  }

  private isWhatsAppMessageType(value: string): value is WhatsAppMessageTypeEnum {
    return (Object.values(WhatsAppMessageTypeEnum) as string[]).includes(value);
  }
}
