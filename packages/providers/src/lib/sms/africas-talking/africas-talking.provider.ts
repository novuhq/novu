import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  IVerifyCredentialsResponse,
} from '@novu/stateless';
import AfricasTalking from 'africastalking';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';

export class AfricasTalkingSmsProvider extends BaseProvider implements ISmsProvider {
  protected casing = CasingEnum.CAMEL_CASE;
  id = SmsProviderIdEnum.AfricasTalking;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private africasTalkingClient: AfricasTalking;

  constructor(
    private config: {
      apiKey: string;
      username: string;
      from?: string;
    }
  ) {
    super();
    this.africasTalkingClient = new AfricasTalking({
      apiKey: config.apiKey,
      username: config.username,
    }).SMS;
  }

  /**
   * Reads the user's balance (`GET /version1/user`). Like the SDK, the `sandbox` username targets the sandbox API.
   */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    const domain =
      this.config.username?.toLowerCase() === 'sandbox' ? 'sandbox.africastalking.com' : 'africastalking.com';

    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(
        `https://api.${domain}/version1/user`,
        {
          params: { username: this.config.username },
          headers: { apiKey: this.config.apiKey, accept: 'application/json' },
        }
      )
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.africasTalkingClient.send(
      this.transform(bridgeProviderData, {
        from: options.from || this.config.from,
        to: options.to,
        message: options.content,
      }).body
    );

    return {
      id: response?.SMSMessageData?.Recipients[0]?.messageId,
      date: new Date().toISOString(),
    };
  }
}
