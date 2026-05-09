import { ChatProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import crypto from 'crypto';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class ChatWebhookProvider extends BaseProvider implements IChatProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = ChatProviderIdEnum.ChatWebhook;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  constructor(
    private config: {
      hmacSecretKey?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for ChatWebhook provider');
    }

    const { content, channelData, phoneNumber } = options;
    const { endpoint } = channelData;

    const data = this.transform(bridgeProviderData, {
      content,
      webhookUrl: endpoint.url,
      channel: endpoint.channel,
      phoneNumber,
    });

    const targetUrlRaw = (data?.body?.webhookUrl as string) || endpoint.url;
    const targetUrl = normalizeOutboundHttpUrl(targetUrlRaw);

    if (!targetUrl) {
      throw new Error('Chat webhook URL blocked: Invalid URL format.');
    }

    // Validate the destination before computing the HMAC, so a blocked URL
    // never sees the signed payload. The connect-time DNS guard and redirect
    // re-validation happen inside safeOutboundJsonRequest.
    try {
      assertSafeOutboundUrl(targetUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Chat webhook URL blocked: ${err.message}`);
      }
      throw err;
    }

    const hmacSecretKey = (data.body.hmacSecretKey as string) || this.config.hmacSecretKey;
    if (data.body.hmacSecretKey as string) {
      delete data.body.hmacSecretKey;
    }
    const body = this.createBody(data.body);
    const hmacValue = this.computeHmac(body, hmacSecretKey);

    const response = await safeOutboundJsonRequest<{ id: string }>({
      url: targetUrl,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature': hmacValue,
        ...data.headers,
      },
      body,
    }).catch((err: unknown) => {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`Chat webhook URL blocked: ${err.message}`);
      }
      throw err;
    });

    return {
      id: response.body?.id,
      date: new Date().toDateString(),
    };
  }

  createBody(options: object): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string, hmacSecretKey?: string): string {
    const secretKey = hmacSecretKey;
    if (!secretKey) {
      return;
    }

    return crypto.createHmac('sha256', secretKey).update(payload, 'utf-8').digest('hex');
  }
}
