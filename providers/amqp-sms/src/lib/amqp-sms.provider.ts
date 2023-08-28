import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import amqplib from 'amqplib';

export class AmqpSmsProvider implements ISmsProvider {
  id = 'amqp-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private amqpUrl: string;
  private queue: string;

  constructor(config: {
    host: string;
    port: string;
    apiKey: string;
    user: string;
    password: string;
  }) {
    this.queue = config.apiKey;
    this.amqpUrl = `amqp://${config.user}:${config.password}@${config.host}`;
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const amqp = await amqplib.connect(this.amqpUrl);
    const channel = await amqp.createChannel();
    channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(options)));

    return {
      id: '1234',
      date: new Date().toISOString(),
    };
  }
}
