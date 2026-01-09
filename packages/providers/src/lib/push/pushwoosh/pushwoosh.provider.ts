import {
    ChannelTypeEnum,
    IPushOptions,
    IPushProvider,
    ISendMessageSuccessResponse,
} from '@novu/stateless';
import { PushProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';

export class PushwooshPushProvider extends BaseProvider implements IPushProvider {
    id = PushProviderIdEnum.Pushwoosh;
    channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
    protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

    constructor(
        private config: {
            applicationId: string;
            apiKey: string;
        }
    ) {
        super();
    }

    async sendMessage(
        options: IPushOptions
    ): Promise<ISendMessageSuccessResponse> {
        void options;

        throw new Error('PushwooshPushProvider.sendMessage is not implemented yet');
    }
}
