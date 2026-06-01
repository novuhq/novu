import crypto from 'node:crypto';
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
import axios from 'axios';
import { setTimeout } from 'node:timers/promises';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

const PROTECTED_HEADER_NAMES = new Set(['content-type', 'x-novu-signature']);

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

  constructor(
    private config: {
      hmacSecretKey?: string;
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

  private async sendWithAxios(bodyData: string, requestHeaders: Record<string, string>): Promise<void> {
    let sent = false;

    for (let retries = 0; !sent && retries < this.config.retryCount; retries += 1) {
      try {
        await axios.create().post(this.config.webhookUrl, bodyData, {
          headers: requestHeaders,
        });
        sent = true;
      } catch {
        await setTimeout(this.config.retryDelay);
      }
    }

    if (!sent) {
      throw new Error('webhook send failed !');
    }
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

    let sent = false;

    for (let retries = 0; !sent && retries < this.config.retryCount; retries += 1) {
      try {
        const response = await safeOutboundJsonRequest({
          url: webhookUrl,
          method: 'POST',
          headers: requestHeaders,
          body: bodyData,
        }).catch((err: unknown) => {
          if (err instanceof SsrfBlockedError) {
            throw new EmailWebhookUrlBlockedError(`Email webhook URL blocked: ${err.message}`);
          }
          throw err;
        });

        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw new Error(`webhook send failed with status ${response.statusCode}`);
        }

        sent = true;
      } catch (error) {
        if (error instanceof EmailWebhookUrlBlockedError || error instanceof SsrfBlockedError) {
          throw error;
        }
        await setTimeout(this.config.retryDelay);
      }
    }

    if (!sent) {
      throw new Error('webhook send failed !');
    }
  }

  createBody(options: WithPassthrough<Record<string, unknown>>): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string): string {
    return crypto.createHmac('sha256', this.config.hmacSecretKey).update(payload, 'utf-8').digest('hex');
  }
}
