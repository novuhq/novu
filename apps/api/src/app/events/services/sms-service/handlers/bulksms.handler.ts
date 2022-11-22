import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BulkSmsSmsProvider } from '@novu/bulkSms';
import { BaseSmsHandler } from './base.handler';

export class BulkSmsSmsHandler extends BaseSmsHandler {
  constructor() {
    super('bulksms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    const config: {
      authKey?: string;
      sender?: string;
      route?: string;
    } = {
      authKey: credentials.authKey,
      sender: credentials.from,
      route: credentials.route,
    };

    this.provider = new BulkSmsSmsProvider(config);
  }
}
