import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';

export function resolveBirdSmsBaseUrl(apiKey: string, baseUrl?: string): string {
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '');
  }

  const match = /^b[kms]_([^_]+)_/.exec(apiKey || '');

  if (match?.[1]) {
    return `https://${match[1]}.platform.bird.com`;
  }

  throw new Error(
    'Could not infer Bird region from API key. Use a key like bk_eu1_... or bk_us1_... or provide baseUrl.'
  );
}

interface BirdSmsResponse {
  id: string;
  created_at?: string;
}

interface BirdSmsWebhookEvent {
  type: string;
  timestamp?: string;
  occurred_at?: string;
  data?: {
    sms_id?: string;
    error?: {
      code?: string;
      description?: string;
    };
  } & Record<string, unknown>;
}

const BIRD_SMS_STATUS_MAP: Record<string, SmsEventStatusEnum> = {
  'sms.accepted': SmsEventStatusEnum.ACCEPTED,
  'sms.sent': SmsEventStatusEnum.SENT,
  'sms.delivered': SmsEventStatusEnum.DELIVERED,
  'sms.undelivered': SmsEventStatusEnum.UNDELIVERED,
  'sms.failed': SmsEventStatusEnum.FAILED,
  'sms.rejected': SmsEventStatusEnum.REJECTED,
  'sms.expired': SmsEventStatusEnum.FAILED,
};

function extractBirdSmsEvents(body: unknown): BirdSmsWebhookEvent[] {
  if (Array.isArray(body)) {
    return body as BirdSmsWebhookEvent[];
  }

  if (body && typeof body === 'object' && Array.isArray((body as { events?: unknown }).events)) {
    return (body as { events: BirdSmsWebhookEvent[] }).events;
  }

  return body ? [body as BirdSmsWebhookEvent] : [];
}

function birdSmsEventResponse(data: BirdSmsWebhookEvent['data']): string | undefined {
  const error = data?.error;

  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if (typeof error.description === 'string' && error.description.length > 0) {
    return error.description;
  }

  if (typeof error.code === 'string' && error.code.length > 0) {
    return error.code;
  }

  return undefined;
}

function getBridgeField<T>(bridgeProviderData: WithPassthrough<Record<string, unknown>>, key: string): T | undefined {
  const direct = (bridgeProviderData as Record<string, unknown>)?.[key] as T | undefined;

  if (direct !== undefined) {
    return direct;
  }

  return (bridgeProviderData as WithPassthrough<Record<string, unknown>>)?._passthrough?.body?.[key] as T | undefined;
}

export class BirdSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Bird;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  private readonly httpClient = createProviderHttpClient();

  constructor(
    private config: {
      apiKey: string;
      from?: string;
      baseUrl?: string;
    }
  ) {
    super();
  }

  private getBaseUrl(): string {
    return resolveBirdSmsBaseUrl(this.config.apiKey, this.config.baseUrl);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const template = getBridgeField<Record<string, unknown>>(bridgeProviderData, 'template');

    if (template && typeof template === 'object') {
      const slug = (template as { slug?: unknown }).slug;
      const name = (template as { name?: unknown }).name;
      const isBuiltInTemplate = (typeof slug === 'string' && slug.startsWith('bird_')) || typeof name === 'string';
      const from =
        options.from ||
        getBridgeField<string>(bridgeProviderData, 'from') ||
        (!isBuiltInTemplate ? this.config.from : undefined);

      const triggerData: Record<string, unknown> = {
        to: options.to,
        ...(from ? { from } : {}),
      };

      const { body } = this.transform(bridgeProviderData, triggerData);
      const payload = body as Record<string, unknown>;

      // A template send supplies its own body and category.
      delete payload.text;
      delete payload.category;

      // Built-in templates select their sender; Bird rejects an explicit from.
      if (isBuiltInTemplate) {
        const bridgeFrom = getBridgeField<string>(bridgeProviderData, 'from');

        if (!options.from && !bridgeFrom) {
          delete payload.from;
        }
      }

      const { data } = await this.httpClient.post<BirdSmsResponse>(`${this.getBaseUrl()}/v1/sms/messages`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      return {
        id: data.id,
        date: data.created_at || new Date().toISOString(),
      };
    }

    const from = options.from || this.config.from;
    const category = getBridgeField<string>(bridgeProviderData, 'category') || 'transactional';

    const { body } = this.transform(bridgeProviderData, {
      to: options.to,
      ...(from ? { from } : {}),
      text: options.content,
      category,
    });

    const { data } = await this.httpClient.post<BirdSmsResponse>(`${this.getBaseUrl()}/v1/sms/messages`, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    return {
      id: data.id,
      date: data.created_at || new Date().toISOString(),
    };
  }

  getMessageId(body: BirdSmsWebhookEvent | BirdSmsWebhookEvent[]): string[] {
    return extractBirdSmsEvents(body)
      .map((event) => event?.data?.sms_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  parseEventBody(body: BirdSmsWebhookEvent | BirdSmsWebhookEvent[], identifier: string): ISMSEventBody | undefined {
    const event = extractBirdSmsEvents(body).find((item) => item?.data?.sms_id === identifier);

    if (!event) {
      return undefined;
    }

    const status = BIRD_SMS_STATUS_MAP[event.type];

    if (!status) {
      return undefined;
    }

    const response = birdSmsEventResponse(event.data);

    return {
      status,
      date: event.timestamp || event.occurred_at || new Date().toISOString(),
      externalId: identifier,
      ...(response ? { response } : {}),
      row: JSON.stringify(event),
    };
  }
}
