/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChannelTypeEnum } from '@novu/shared';
import { MSGraphAPIProvider } from '@novu/msgraph';
import { BaseHandler } from './base.handler';
import { ICredentials } from '@novu/dal';

export class MSGraphHandler extends BaseHandler {
  constructor() {
    super('msgraph', ChannelTypeEnum.EMAIL);
  }
  buildProvider(credentials: ICredentials, from?: string) {
    // null-assertion is disabled because we want to expose the error from the MS Graph API
    this.provider = new MSGraphAPIProvider({
      clientId: credentials.clientId!,
      authority: credentials.applicationId!,
      secret: credentials.apiKey!,
      scopes: credentials.region!,
      user: credentials.user!,
      fromAddress: credentials.host!,
      fromName: credentials.from!,
    });
  }
}
