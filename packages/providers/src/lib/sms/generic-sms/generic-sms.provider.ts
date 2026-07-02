import { isOutboundSsrfProtectionEnabled, SmsProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';

import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class GenericSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.GenericSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  axiosInstance?: AxiosInstance;
  headers: Record<string, string>;

  constructor(
    private config: {
      baseUrl: string;
      apiKeyRequestHeader: string;
      apiKey: string;
      secretKeyRequestHeader?: string;
      secretKey?: string;
      from: string;
      idPath?: string;
      datePath?: string;
      authenticateByToken?: boolean;
      domain?: string;
      authenticationTokenKey?: string;
    }
  ) {
    super();
    this.headers = {
      [this.config?.apiKeyRequestHeader]: config.apiKey,
    };

    if (this.config?.secretKeyRequestHeader && this.config?.secretKey) {
      this.headers[this.config?.secretKeyRequestHeader] = config.secretKey;
    }

    if (!this.config?.authenticateByToken) {
      this.axiosInstance = axios.create({
        baseURL: config.baseUrl,
        headers: this.headers,
      });
    }
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (isOutboundSsrfProtectionEnabled()) {
      return this.sendMessageWithSsrfProtection(options, bridgeProviderData);
    }

    return this.sendMessageWithAxios(options, bridgeProviderData);
  }

  private async sendMessageWithAxios(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      ...options,
      sender: options.from || this.config.from,
    });

    if (this.config?.authenticateByToken) {
      const tokenAxiosInstance = await axios.request({
        method: 'POST',
        baseURL: this.config.domain,
        headers: this.headers,
      });

      const token = tokenAxiosInstance.data.data[this.config.authenticationTokenKey!];

      this.axiosInstance = axios.create({
        baseURL: this.config.baseUrl,
        headers: {
          [this.config.authenticationTokenKey!]: token,
          ...data.headers,
        },
      });
    }

    const response = await this.axiosInstance!.request({
      method: 'POST',
      data: data.body,
    });

    const responseData = response.data as Record<string, unknown>;

    return {
      id: this.getResponseValue(this.config.idPath || 'id', responseData) ?? '',
      date: this.getResponseValue(this.config.datePath || 'date', responseData) || new Date().toISOString(),
    };
  }

  private async sendMessageWithSsrfProtection(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      ...options,
      sender: options.from || this.config.from,
    });

    let requestHeaders: Record<string, string> = { ...this.headers, ...data.headers };
    const baseUrl = this.assertSafeSmsUrl(this.config.baseUrl, 'Generic SMS URL blocked');

    if (this.config?.authenticateByToken) {
      const authTokenKey = this.config.authenticationTokenKey;
      if (!authTokenKey) {
        throw new Error('Generic SMS auth URL blocked: authenticationTokenKey is required.');
      }

      const domainUrl = this.assertSafeSmsUrl(this.config.domain, 'Generic SMS auth URL blocked');

      const tokenResponse = await this.safeJsonRequest(domainUrl, {
        method: 'POST',
        headers: requestHeaders,
        blockedPrefix: 'Generic SMS auth URL blocked',
      });

      this.assertSuccessStatus(tokenResponse.statusCode, 'Generic SMS auth request failed');

      const tokenBody = tokenResponse.body as { data?: Record<string, string> };
      const token = tokenBody?.data?.[authTokenKey];

      if (!token) {
        throw new Error('Generic SMS auth request failed: authentication token missing from response.');
      }

      requestHeaders = {
        ...this.headers,
        ...data.headers,
        [authTokenKey]: token,
      };
    }

    const response = await this.safeJsonRequest(baseUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: data.body as Record<string, unknown>,
      blockedPrefix: 'Generic SMS URL blocked',
    });

    this.assertSuccessStatus(response.statusCode, 'Generic SMS request failed');

    const responseData = this.asResponseRecord(response.body);

    return {
      id: this.getResponseValue(this.config.idPath || 'id', responseData) ?? '',
      date: this.getResponseValue(this.config.datePath || 'date', responseData) || new Date().toISOString(),
    };
  }

  private assertSafeSmsUrl(urlRaw: string | undefined, blockedPrefix: string): string {
    const url = normalizeOutboundHttpUrl(urlRaw ?? '');

    if (!url) {
      throw new Error(`${blockedPrefix}: Invalid URL format.`);
    }

    try {
      assertSafeOutboundUrl(url);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`${blockedPrefix}: ${err.message}`);
      }
      throw err;
    }

    return url;
  }

  private assertSuccessStatus(statusCode: number, message: string): void {
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`${message} with status ${statusCode}`);
    }
  }

  private safeJsonRequest(
    url: string,
    options: {
      method: 'POST';
      headers: Record<string, string>;
      body?: Record<string, unknown>;
      blockedPrefix?: string;
    }
  ) {
    const blockedPrefix = options.blockedPrefix ?? 'Generic SMS URL blocked';

    return safeOutboundJsonRequest({
      url,
      method: options.method,
      headers: options.headers,
      body: options.body,
    }).catch((err: unknown) => {
      if (err instanceof SsrfBlockedError) {
        throw new Error(`${blockedPrefix}: ${err.message}`);
      }
      throw err;
    });
  }

  private asResponseRecord(body: unknown): Record<string, unknown> {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }

    return {};
  }

  private getResponseValue(path: string, data: Record<string, unknown>): string | undefined {
    let current: unknown = data;

    for (const segment of path.split('.')) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    if (typeof current === 'string') {
      return current;
    }

    if (current === undefined || current === null) {
      return undefined;
    }

    return String(current);
  }
}
