import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  IVerifyCredentialsResponse,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';

export class ClicksendSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Clicksend;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  private readonly httpClient = createProviderHttpClient();

  constructor(
    private config: {
      username: string;
      apiKey: string;
    }
  ) {
    super();
  }

  /** Reads the account (`GET /v3/account`) with the same username / API key pair the sends use. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(
        'https://rest.clicksend.com/v3/account',
        { auth: { username: this.config.username, password: this.config.apiKey } }
      )
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      to: options.to,
      body: options.content,
    });
    const response = await this.httpClient.post(
      'https://rest.clicksend.com/v3/sms/send',
      {
        messages: [data.body],
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.apiKey}`).toString('base64')}`,
          ...data.headers,
        },
      }
    );

    return {
      id: response.data.data.messages[0].message_id,
      date: response.data.data.messages[0].date,
    };
  }
}
