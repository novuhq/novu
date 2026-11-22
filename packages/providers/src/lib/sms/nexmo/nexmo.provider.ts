import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  IVerifyCredentialsResponse,
} from '@novu/stateless';
import { Auth } from '@vonage/auth';
import { Vonage } from '@vonage/server-sdk';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { verifyCredentialsWith } from '../../../utils/verify-credentials';

export class NexmoSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Nexmo;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private vonageClient: Vonage;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      apiKey: string;
      apiSecret: string;
      from: string;
    }
  ) {
    super();
    this.vonageClient = new Vonage(
      new Auth({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
      })
    );
  }

  /** Reads the account balance: a read-only call that any valid key/secret pair can make. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    return verifyCredentialsWith(() => this.vonageClient.accounts.getBalance());
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.vonageClient.sms.send(
      // biome-ignore lint/suspicious/noExplicitAny: pre-existing; provider SDK request type differs from the transformed body
      this.transform<any>(bridgeProviderData, {
        to: options.to,
        from: this.config.from,
        text: options.content,
      }).body
    );

    return {
      id: response.messages[0]['message-id'],
      date: new Date().toISOString(),
    };
  }
}
