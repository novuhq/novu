import { AliyunSmsProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class AliyunSmsHandler extends BaseSmsHandler {
  constructor() {
    super(SmsProviderIdEnum.Aliyun, ChannelTypeEnum.SMS);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new AliyunSmsProvider({
      accessKeyId: credentials.apiKey,
      accessKeySecret: credentials.secretKey,
      from: credentials.from,
      templateId: credentials.templateId,
    });
  }
}
