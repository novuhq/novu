import { PushpadPushProvider } from './pushpad.provider';

test('should trigger pushpad library correctly', async () => {
  const provider = new PushpadPushProvider({
    apiKey: 'test-token',
    appId: '012345',
  });
});
