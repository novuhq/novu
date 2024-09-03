import { expect, test } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { BurstSmsProvider } from './burst-sms.provider';

test('should trigger Burst SMS axios request correctly', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: { message_id: uuidv4, send_at: new Date().toISOString() },
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
    'message=Welcome.%20This%20is%20a%20test%20message&to=%2B15555555',
  );
});

test('should trigger Burst SMS axios request correctly with _passthrough', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: { message_id: uuidv4, send_at: new Date().toISOString() },
  });

  const provider = new BurstSmsProvider({ apiKey: '', secretKey: '' });

  const testTo = '+15555555';
  const testContent = 'Welcome. This is a test message';
  await provider.sendMessage(
    {
      content: testContent,
      to: testTo,
    },
    {
      _passthrough: {
        body: {
          to: '+25555555',
        },
      },
    },
  );

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    'https://api.transmitsms.com/send-sms.json',
    'message=Welcome.%20This%20is%20a%20test%20message&to=%2B25555555',
  );
});
