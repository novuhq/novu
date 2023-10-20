import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';
import { BulkSmsSmsProvider } from '@novu/bulk-sms';

export class BulkSmsHandler extends BaseSmsHandler {
  constructor() {
    super('bulk-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    if (!credentials.user || !credentials.password) {
      throw Error('Invalid credentials');
    }

    const config = {
      username: credentials.user,
      password: credentials.password,
    };

    this.provider = new BulkSmsSmsProvider(config);
  }
}
