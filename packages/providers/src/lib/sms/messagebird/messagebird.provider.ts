import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  IVerifyCredentialsResponse,
} from '@novu/stateless';
import { initClient } from 'messagebird';
import { Message, MessageParameters } from 'messagebird/types/messages';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';

export class MessageBirdSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.MessageBird;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  private messageBirdClient: ReturnType<typeof initClient>;
  constructor(
    private config: {
      access_key?: string;
    }
  ) {
    super();
    this.messageBirdClient = initClient(config.access_key);
  }

  /** Reads the account balance (`GET /balance`), which any valid access key can do. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(
        'https://rest.messagebird.com/balance',
        { headers: { Authorization: `AccessKey ${this.config.access_key}` } }
      )
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const params = this.transform<MessageParameters>(bridgeProviderData, {
      originator: options.from,
      recipients: [options.to],
      body: options.content,
    }).body;

    const response = await new Promise<Message>((resolve, reject) => {
      this.messageBirdClient.messages.create(params, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });

    return {
      id: response.id,
      date: response.createdDatetime,
    };
  }
}
