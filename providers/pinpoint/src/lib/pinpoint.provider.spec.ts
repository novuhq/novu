import { PinpointSMSVoiceV2 } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { PinpointSMSProvider } from './pinpoint.provider';

test('should trigger pinpoint library correctly', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = jest
    .spyOn(PinpointSMSVoiceV2.prototype, 'send')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mockResponse as any;
    });

  const mockConfig = {
    region: 'test-1',
    accessKeyId: 'TEST',
    from: '+112345',
    secretAccessKey: 'TEST',
  };
  const provider = new PinpointSMSProvider(mockConfig);

  const mockNovuMessage = {
    content: 'Hello from Novu!',
    to: '+1234567890',
    from: mockConfig.from,
  };
  const response = await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(response.id).toEqual('');
});
