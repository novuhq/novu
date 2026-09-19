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

/**
 * 8x8 ChatApps message types. Unlike the Meta Graph API (where each type is a top-level key),
 * 8x8 nests the typed body under `content` (e.g. `content.text`, `content.template`,
 * `content.interactive`, or `content.url` for media). Values are lowercase — the capitalized
 * forms from the inbound webhook shape are rejected by WhatsApp as unsupported parameters.
 */
export enum EightByEightWhatsAppMessageTypeEnum {
  TEXT = 'text',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  LOCATION = 'location',
  CONTACTS = 'contacts',
  STICKER = 'sticker',
}

/** Content sub-keys that unambiguously identify a message type (media types carry `url`, not a named key). */
const TYPE_NAMED_CONTENT_KEYS: EightByEightWhatsAppMessageTypeEnum[] = [
  EightByEightWhatsAppMessageTypeEnum.TEMPLATE,
  EightByEightWhatsAppMessageTypeEnum.INTERACTIVE,
  EightByEightWhatsAppMessageTypeEnum.LOCATION,
  EightByEightWhatsAppMessageTypeEnum.CONTACTS,
];

/**
 * 8x8 Messaging Apps API for WhatsApp (a.k.a. 8x8 Connect / ChatApps).
 * Delivers to a recipient addressed by `msisdn` (phone number).
 *
 * Defaults to a freeform `text` message (only deliverable inside the 24-hour customer service
 * window). Business-initiated conversations require a pre-approved `template`; callers select any
 * non-text type — `template`, `interactive`, media, etc. — by setting `type` (and the matching
 * `content`) via `options.customData`, `bridgeProviderData`, or `_passthrough`. See
 * https://developer.8x8.com/connect/docs/usage-samples-whatsapp for the per-type `content` shapes.
 */
export class EightByEightWhatsAppChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.EightByEightWhatsApp;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  private readonly axiosClient: AxiosInstance;
  private readonly baseUrl = 'https://chatapps.8x8.com/api/v1';

  constructor(
    private config: {
      apiKey: string;
      subAccountId: string;
    }
  ) {
    super();
    this.axiosClient = Axios.create({
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.PHONE)) {
      throw new Error('Invalid channel data for 8x8 WhatsApp provider, expected a phone endpoint');
    }

    const { phoneNumber } = options.channelData.endpoint;
    const type = this.defineMessageType(options, bridgeProviderData);

    const merged = this.transform(bridgeProviderData, this.defineMessagePayload(options, phoneNumber, type))
      .body as Record<string, unknown>;

    const payload = this.projectMessagePayload(merged, type, options);

    const { data: response } = await this.axiosClient.post(
      `${this.baseUrl}/subaccounts/${this.config.subAccountId}/messages`,
      payload
    );

    return {
      id: response?.umid,
      date: new Date().toISOString(),
    };
  }

  /**
   * Build the base payload for the resolved type. Only `text` seeds a default `content.text`
   * (from the step body) — every other type takes its `content` from the caller so we never leave
   * a stray `text` alongside a `template`/media body.
   */
  private defineMessagePayload(options: IChatOptions, phoneNumber: string, type: EightByEightWhatsAppMessageTypeEnum) {
    const basePayload = {
      user: { msisdn: phoneNumber },
      type,
    };

    if (type === EightByEightWhatsAppMessageTypeEnum.TEXT) {
      const textOverride = options.customData?.content?.text ?? options.customData?.text;

      return {
        ...basePayload,
        content: { text: textOverride ?? options.content },
      };
    }

    const contentData = options.customData?.content ?? options.customData?.[type];

    if (contentData === undefined) {
      return basePayload;
    }

    return {
      ...basePayload,
      content: contentData,
    };
  }

  /**
   * Pin the resolved `type` after the merge and guarantee a text body for `text` messages
   * (so an override that dropped `content.text` still sends the step body).
   */
  private projectMessagePayload(
    merged: Record<string, unknown>,
    type: EightByEightWhatsAppMessageTypeEnum,
    options: IChatOptions
  ) {
    const payload: Record<string, unknown> = { ...merged, type };

    if (type === EightByEightWhatsAppMessageTypeEnum.TEXT) {
      const content = (payload.content ?? {}) as Record<string, unknown>;

      if (content.text == null) {
        payload.content = { ...content, text: options.content };
      }
    }

    return payload;
  }

  private defineMessageType(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): EightByEightWhatsAppMessageTypeEnum {
    const { _passthrough = {}, ...bridgeData } = bridgeProviderData;
    const passthroughBody = (_passthrough.body || {}) as Record<string, unknown>;

    // Highest priority first — matches the transform merge order. Resolve each source fully
    // (explicit `type`, then a type-named `content` key) before falling through to a lower one.
    const sources = [passthroughBody, bridgeData as Record<string, unknown>, options.customData].filter(
      (source): source is Record<string, unknown> => source != null && Object.keys(source).length > 0
    );

    for (const source of sources) {
      const typeFromSource = this.resolveTypeFromSource(source);

      if (typeFromSource) {
        return typeFromSource;
      }
    }

    return EightByEightWhatsAppMessageTypeEnum.TEXT;
  }

  private resolveTypeFromSource(source: Record<string, unknown>): EightByEightWhatsAppMessageTypeEnum | undefined {
    if (typeof source.type === 'string' && this.isWhatsAppMessageType(source.type)) {
      return source.type;
    }

    // 8x8 nests the typed body under `content`; infer from an unambiguous named key
    // (`template`/`interactive`/`location`/`contacts`). Media (`image`/…) carry `url`, not a
    // named key, so they require an explicit `type`.
    const content = source.content as Record<string, unknown> | undefined;

    if (content) {
      for (const key of TYPE_NAMED_CONTENT_KEYS) {
        if (key in content) {
          return key;
        }
      }
    }

    return undefined;
  }

  private isWhatsAppMessageType(value: string): value is EightByEightWhatsAppMessageTypeEnum {
    return (Object.values(EightByEightWhatsAppMessageTypeEnum) as string[]).includes(value);
  }
}
