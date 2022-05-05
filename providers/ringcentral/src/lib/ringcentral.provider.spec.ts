import { RingCentralSmsProvider } from './ringcentral.provider';

test('should trigger ringcentral library correctly', async () => {
    const provider = new RingCentralSmsProvider({
        username: '<ringcentral-username>',
        password: '<ringcentral-password>',
        from: '+112345',
    });

    const result = await provider.sendMessage({
        to: '+123456789',
        content: 'Hello World',
    });
    
    expect(result).toEqual({
        id: expect.any(Number),
        date: expect.any(String),
    });
});
