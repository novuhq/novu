import { RingcentralSmsProvider } from './ringcentral.provider';

test('should trigger ringcentral library correctly', async () => {
    const provider = new RingcentralSmsProvider({
        clientId: '<ringcentral-client-id>',
        clientSecret: '<ringcentral-client-secret>',
        from: '+112345',
    });
    
    const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.ringCentralClient, 'post');

    await provider.sendMessage({
        to: '+123456789',
        content: 'Hello World',
    });
    
    expect(result).toEqual({
        id: expect.any(String),
        date: expect.any(String),
    });
});
