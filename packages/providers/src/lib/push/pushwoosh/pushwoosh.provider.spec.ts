import { ChannelTypeEnum, PushProviderIdEnum } from '@novu/shared';
import { PushwooshPushProvider } from './pushwoosh.provider';

describe('PushwooshPushProvider', () => {
    const config = {
        applicationId: 'TEST-APP-CODE',
        apiKey: 'test-api-key',
    };

    test('should create provider instance', () => {
        const provider = new PushwooshPushProvider(config);
        expect(provider.id).toBe(PushProviderIdEnum.Pushwoosh);
        expect(provider.channelType).toBe(ChannelTypeEnum.PUSH);
    });

    test('should throw not implemented error', async () => {
        const provider = new PushwooshPushProvider(config);

        const options = {
            title: 'Test Notification',
            content: 'This is a test message',
            target: ['device-token-1', 'device-token-2'],
            payload: {
                customData: 'test',
            },
        };

        await expect(provider.sendMessage(options)).rejects.toThrow(
            'PushwooshPushProvider.sendMessage is not implemented yet'
        );
    });
});

