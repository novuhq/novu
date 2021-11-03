import { SNSClient } from '@aws-sdk/client-sns';

import { SnsEmailProvider } from './sns.provider';

test('should trigger sns library correctly', async () => {
  const mockResponse = { MessageId: 'mock-message-id'  };
  const spy = jest
    .spyOn(SNSClient.prototype, 'send')
    .mockImplementation(async () => mockResponse);

  const mockConfig = {
    from: '',
    accessKeyId: 'TEST',
    secretAccessKey: 'TEST',
    region: 'test-1',
  };
  const provider = new SnsEmailProvider(mockConfig);

  const mockNotifireMessage = {
    to: '0123456789',
    content: 'hello',
  };
  const response = await provider.sendMessage(mockNotifireMessage);

  const publishInput = {
    input: {
      PhoneNumber: mockNotifireMessage.to,
      Message: mockNotifireMessage.content
    }
  }

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(expect.objectContaining(publishInput))
  expect(response.id).toBe(mockResponse.MessageId)
});
