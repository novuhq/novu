import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  IVerifyCredentialsResponse,
} from '@novu/stateless';
import { ProxyAgent } from 'proxy-agent';
import 'cross-fetch';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient, providerFetch } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';

export class BrevoSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.BrevoSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://api.brevo.com/v3';
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    super();
  }

  /** Reads the account (`GET /v3/account`), which any valid API key can do. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(`${this.BASE_URL}/account`, {
        headers: { 'api-key': this.config.apiKey, accept: 'application/json' },
      })
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const sms = this.transform(bridgeProviderData, {
      sender: options.from || this.config.from,
      recipient: options.to,
      content: options.content,
    });

    const response = await providerFetch(`${this.BASE_URL}/transactionalSMS/sms`, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...sms.headers,
      },
      agent: new ProxyAgent(),
      body: JSON.stringify(sms.body),
    } as RequestInit);

    const body: { messageId: string } = await response.json();

    if (!body.messageId) {
      throw new Error(`Failed: ${JSON.stringify(body)}`);
    }

    return {
      id: body.messageId,
      date: new Date().toISOString(),
    };
  }
}
