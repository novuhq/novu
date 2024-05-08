import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

import { SNSConfig } from './sns.config';

export class SNSSmsProvider implements ISmsProvider {
  id = 'sns';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private client: SNSClient;

  constructor(private readonly config: SNSConfig) {
    this.client = new SNSClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { to, content } = options;

    const publish = new PublishCommand({
      PhoneNumber: to,
      Message: content,
    });

    const snsResponse = await this.client.send(publish);

    return {
      id: snsResponse.MessageId,
      date: new Date().toISOString(),
    };
  }
}
