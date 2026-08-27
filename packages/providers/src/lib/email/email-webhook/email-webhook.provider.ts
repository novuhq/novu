import crypto from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { EmailProviderIdEnum, isOutboundSsrfProtectionEnabled } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient, PROVIDER_HTTP_TIMEOUT_MS } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';

const PROTECTED_HEADER_NAMES = new Set(['content-type', 'x-novu-signature']);

/** Mirrors the default in `safeOutboundJsonRequest`, which takes no timeout of its own here. */
const SSRF_REQUEST_TIMEOUT_MS = 30_000;

/**
 * How the `hmacSecretKey` value is turned into signing bytes:
 * - `text`: the raw UTF-8 bytes of the stored string (legacy/default behavior)
 * - `base64` / `hex`: decode the stored string into its binary key material,
 *   matching services (e.g. AWS KMS) that hold the HMAC key as binary
 */
export type EmailWebhookHmacSecretKeyEncoding = 'text' | 'base64' | 'hex';

export class EmailWebhookUrlBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailWebhookUrlBlockedError';
  }
}

export class EmailWebhookProvider extends BaseProvider implements IEmailProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = EmailProviderIdEnum.EmailWebhook;
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly httpClient = createProviderHttpClient({ providerId: this.id, channel: this.channelType });

  constructor(
    private config: {
      hmacSecretKey?: string;
      hmacSecretKeyEncoding?: EmailWebhookHmacSecretKeyEncoding;
      webhookUrl: string;
      retryCount?: number;
      retryDelay?: number;
    }
  ) {
    super();
    this.config.retryDelay ??= 30 * 1000;
    this.config.retryCount ??= 3;
  }

  async checkIntegration(_options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const transformedData = this.transform(bridgeProviderData, options);
    const bodyData = this.createBody(transformedData.body);
    const hmacValue = this.computeHmac(bodyData);
    const passthroughHeaders = Object.fromEntries(
      Object.entries(transformedData.headers ?? {}).filter(
        ([headerName]) => !PROTECTED_HEADER_NAMES.has(headerName.toLowerCase())
      )
    );
    const requestHeaders = {
      ...passthroughHeaders,
      'content-type': 'application/json',
      'X-Novu-Signature': hmacValue,
    };

    if (isOutboundSsrfProtectionEnabled()) {
      await this.sendWithSsrfProtection(bodyData, requestHeaders);
    } else {
      await this.sendWithAxios(bodyData, requestHeaders);
    }

    return {
      id: options.id,
      date: new Date().toDateString(),
    };
  }

  /**
   * Runs `attempt` up to `retryCount` times, bounded by a single wall-clock budget of
   * {@link PROVIDER_HTTP_TIMEOUT_MS} covering every request and every delay between them.
   *
   * Without the budget, the configured `retryCount` and `retryDelay` multiply the
   * per-request timeout: three attempts at 120s with two 30s delays would hold a worker
   * slot for over seven minutes on a single step. `retryCount` and `retryDelay` are
   * therefore an upper bound rather than a guarantee — the loop stops early once the
   * budget is spent.
   *
   * `attempt` receives the milliseconds left, so it can cap its own request accordingly.
   */
  private async sendWithinBudget(attempt: (remainingMs: number) => Promise<void>): Promise<void> {
    const deadline = Date.now() + PROVIDER_HTTP_TIMEOUT_MS;
    const remaining = () => deadline - Date.now();
    const lastAttemptIndex = this.config.retryCount - 1;

    for (let index = 0; index < this.config.retryCount; index += 1) {
      const remainingMs = remaining();

      if (remainingMs <= 0) {
        break;
      }

      try {
        await attempt(remainingMs);

        return;
      } catch (error) {
        if (error instanceof EmailWebhookUrlBlockedError || error instanceof SsrfBlockedError) {
          throw error;
        }

        if (index === lastAttemptIndex) {
          break;
        }

        const delayMs = Math.min(this.config.retryDelay, remaining());

        if (delayMs <= 0) {
          break;
        }

        await setTimeout(delayMs);
      }
    }

    throw new Error('webhook send failed !');
  }

  private async sendWithAxios(bodyData: string, requestHeaders: Record<string, string>): Promise<void> {
    await this.sendWithinBudget(async (remainingMs) => {
      await this.httpClient.post(this.config.webhookUrl, bodyData, {
        headers: requestHeaders,
        timeout: remainingMs,
      });
    });
  }

  private async sendWithSsrfProtection(bodyData: string, requestHeaders: Record<string, string>): Promise<void> {
    const webhookUrl = normalizeOutboundHttpUrl(this.config.webhookUrl);

    if (!webhookUrl) {
      throw new EmailWebhookUrlBlockedError('Email webhook URL blocked: Invalid URL format.');
    }

    // Structure-only check (scheme, credentials, blocked hostnames). Literal private IPs
    // are rejected at connect time inside safeOutboundJsonRequest.
    try {
      assertSafeOutboundUrl(webhookUrl);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new EmailWebhookUrlBlockedError(`Email webhook URL blocked: ${err.message}`);
      }
      throw err;
    }

    await this.sendWithinBudget(async (remainingMs) => {
      const response = await safeOutboundJsonRequest({
        url: webhookUrl,
        method: 'POST',
        headers: requestHeaders,
        body: bodyData,
        timeoutMs: Math.min(SSRF_REQUEST_TIMEOUT_MS, remainingMs),
      }).catch((err: unknown) => {
        if (err instanceof SsrfBlockedError) {
          throw new EmailWebhookUrlBlockedError(`Email webhook URL blocked: ${err.message}`);
        }
        throw err;
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`webhook send failed with status ${response.statusCode}`);
      }
    });
  }

  createBody(options: WithPassthrough<Record<string, unknown>>): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string): string {
    return crypto.createHmac('sha256', this.resolveHmacSecret()).update(payload, 'utf-8').digest('hex');
  }

  private resolveHmacSecret(): Buffer | string {
    const encoding = this.config.hmacSecretKeyEncoding ?? 'text';

    if (encoding === 'text') {
      return this.config.hmacSecretKey as string;
    }

    if (!['base64', 'hex'].includes(encoding)) {
      throw new Error(`Unsupported hmacSecretKeyEncoding: '${encoding}'. Supported encodings: text, base64, hex`);
    }

    if (!this.config.hmacSecretKey) {
      throw new Error(`hmacSecretKeyEncoding '${encoding}' requires a non-empty hmacSecretKey`);
    }

    const keyBuffer = Buffer.from(this.config.hmacSecretKey, encoding);

    if (keyBuffer.length === 0) {
      throw new Error(`hmacSecretKey is not valid ${encoding}: decoding produced no bytes`);
    }

    return keyBuffer;
  }
}
