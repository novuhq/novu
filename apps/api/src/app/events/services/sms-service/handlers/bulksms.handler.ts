import { ChannelTypeEnum } from '@novu/shared';
import { ICredentials } from '@novu/dal';
import { BulkSmsSmsProvider } from 'D:/Novu_latest/novu/providers/bulkSms/src/lib/bulkSms.provider';
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
      // dltEntityId?: string;
    } = {
      authKey: credentials.authKey,
      sender: credentials.sender,
      route: credentials.route,
      // dltEntityId: credentials.dltEntityId,
    };

    this.provider = new BulkSmsSmsProvider(config);
  }
}
