import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { SmsParams } from '../types/sms';

export * from '../types/sms';

export class BulkSmsSmsProvider implements ISmsProvider {
  public readonly DEFAULT_BASE_URL = 'https://api.bulksms.com/v1/message';
  id = 'bulk-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      username: string;
      password: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const payload: SmsParams = {
      to: options.to,
      body: options.content,
    };

    const url = this.DEFAULT_BASE_URL;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            this.config.username + ':' + this.config.password
          ).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      id: options.id,
      date: new Date().toISOString(),
    };
  }
}
