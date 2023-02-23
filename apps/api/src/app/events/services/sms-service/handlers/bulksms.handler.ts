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
      dltEntity?: string;
    } = {
      authKey: credentials.apiKey,
      sender: credentials.from,
      route: credentials.route,
      dltEntity: credentials.dltEntity,
    };

    this.provider = new BulkSmsSmsProvider(config);
  }
}
