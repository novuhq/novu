import { SNSClient } from '@aws-sdk/client-sns';

import { SNSSmsProvider } from './sns.provider';

test('should trigger sns library correctly', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = jest
    .spyOn(SNSClient.prototype, 'send')
    .mockImplementation(async () => mockResponse);

  const mockConfig = {
    accessKeyId: 'TEST',
    secretAccessKey: 'TEST',
    region: 'test-1',
  };
  const provider = new SNSSmsProvider(mockConfig);

  const mockNovuMessage = {
    to: '0123456789',
    content: 'hello',
  };
  const response = await provider.sendMessage(mockNovuMessage);

  const publishInput = {
    input: {
      PhoneNumber: mockNovuMessage.to,
      Message: mockNovuMessage.content,
    },
  };

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(expect.objectContaining(publishInput));
  expect(response.id).toBe(mockResponse.MessageId);
});
