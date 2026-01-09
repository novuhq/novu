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
            applicationCode: string;
            apiKey: string;
        }
    ) {
        super();
    }

    async sendMessage(
        options: IPushOptions
    ): Promise<ISendMessageSuccessResponse> {
        // TODO: Implement Pushwoosh API logic here
        // https://docs.pushwoosh.com/platform-docs/api-reference/messages
        // Use this.config.applicationCode and this.config.apiKey

        return {
            ids: ['stub_id'], // Placeholder
            date: new Date().toISOString(),
        };
    }
}
