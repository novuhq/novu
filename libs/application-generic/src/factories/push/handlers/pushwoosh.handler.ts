import { PushwooshPushProvider } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, PushProviderIdEnum } from '@novu/shared';
import { BasePushHandler } from './base.handler';

export class PushwooshHandler extends BasePushHandler {
    constructor() {
        super(PushProviderIdEnum.Pushwoosh, ChannelTypeEnum.PUSH);
    }

    buildProvider(credentials: ICredentials) {
        if (!credentials.apiKey || !credentials.applicationId) {
            throw Error('Config is not valid for Pushwoosh');
        }

        this.provider = new PushwooshPushProvider({
            applicationId: credentials.applicationId,
            apiKey: credentials.apiKey,
        });
    }
}
