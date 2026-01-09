import { PushwooshPushProvider } from './pushwoosh.provider';

describe('PushwooshPushProvider', () => {
    const config = {
        applicationCode: 'TEST-APP-CODE',
        apiKey: 'test-api-key',
    };

    test('should create provider instance', () => {
        const provider = new PushwooshPushProvider(config);
        expect(provider.id).toBe('pushwoosh');
        expect(provider.channelType).toBe('push');
    });

    test('should send message successfully', async () => {
        const provider = new PushwooshPushProvider(config);

        const options = {
            title: 'Test Notification',
            content: 'This is a test message',
            target: ['device-token-1', 'device-token-2'],
            payload: {
                customData: 'test',
            },
        };

        const result = await provider.sendMessage(options);

        expect(result).toHaveProperty('ids');
        expect(result).toHaveProperty('date');
        expect(Array.isArray(result.ids)).toBe(true);
    });
});
