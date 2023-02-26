import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { BurstSmsProvider } from './burst-sms.provider';

test('should trigger Burst SMS axios request correctly', async () => {
  const fakePost = jest.fn(() => {
    return { data: { message_id: uuidv4, send_at: new Date().toISOString() } };
  });

  jest.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  const provider = new BurstSmsProvider({ apiKey: '', secretKey: '' });

  const testTo = '+15555555';
  const testContent = 'Welcome. This is a test message';
  await provider.sendMessage({
    content: testContent,
    to: testTo,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    'https://api.transmitsms.com/send-sms.json',
    'message=Welcome.%20This%20is%20a%20test%20message&to=%2B15555555'
  );
});
