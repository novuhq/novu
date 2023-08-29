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

  constructor(config: {
    host: string;
    port: string;
    user: string;
    password: string;
  }) {
    this.amqpUrl = `amqp://${config.user}:${config.password}@${config.host}`;
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const amqp = await amqplib.connect(this.amqpUrl);
    const channel = await amqp.createChannel();
    channel.sendToQueue('novu-sms', Buffer.from(JSON.stringify(options)));

    return {
      id: [...Array(16)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join(''),
      date: new Date().toISOString(),
    };
  }
}
