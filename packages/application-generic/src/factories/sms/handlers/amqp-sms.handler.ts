import { ChannelTypeEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { AmqpSmsProvider } from '@novu/amqp-sms';

export class AmqpSmsHandler extends BaseSmsHandler {
  constructor() {
    super('amqp-sms', ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: any) {
    this.provider = new AmqpSmsProvider({
      apiKey: credentials.apiKey,
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
    });
  }
}
