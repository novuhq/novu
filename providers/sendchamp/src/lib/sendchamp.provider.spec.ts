import { SendchampSmsProvider } from './sendchamp.provider';
import axios from 'axios';

const mockConfig = {
  apiKey: 'test-key',
  from: 'sendchamp',
};

const mockNovuMessage = {
  to: '2348055372961',
  content: 'sms content',
};

test('should trigger sendchamp library correctly', async () => {
  const smsProvider = new SendchampSmsProvider(mockConfig);

  const spy = jest
    .spyOn(smsProvider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: '67890-90q8',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await smsProvider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith({
    to: '2348055372961',
    content: 'sms content',
  });
});
