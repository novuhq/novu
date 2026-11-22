import { AuthType, Infobip } from '@infobip-api/sdk';
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
import { resolveSafeInfobipBaseUrl } from '../../../utils/safe-infobip-base-url';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';

export class InfobipSmsProvider extends BaseProvider implements ISmsProvider {
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  id = SmsProviderIdEnum.Infobip;
  protected casing = CasingEnum.CAMEL_CASE;

  private infobipClient;

  constructor(
    private config: {
      baseUrl: string;
      apiKey?: string;
      from?: string;
    }
  ) {
    super();
    const baseUrl = resolveSafeInfobipBaseUrl(this.config.baseUrl);

    this.infobipClient = new Infobip({
      baseUrl,
      apiKey: this.config.apiKey,
      authType: AuthType.ApiKey,
    });
  }

  /** Reads the account balance (`GET /account/1/balance`) on the same safe-checked base URL the sends use. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    const baseUrl = resolveSafeInfobipBaseUrl(this.config.baseUrl).replace(/\/+$/, '');

    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(`${baseUrl}/account/1/balance`, {
        headers: { Authorization: `App ${this.config.apiKey}` },
      })
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const infobipResponse = await this.infobipClient.channels.sms.send({
      messages: [
        this.transform(bridgeProviderData, {
          text: options.content,
          destinations: [
            {
              to: options.to,
            },
          ],
          from: options.from || this.config.from,
        }).body,
      ],
    });
    const { messageId } = infobipResponse.data.messages.pop();

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
