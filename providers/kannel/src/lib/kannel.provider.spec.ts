import axios from 'axios';
import { KannelSmsProvider } from './kannel.provider';

test('should trigger Kannel SMS axios request correctly', async () => {
  const fakeGet = jest.fn(() => {
    return Promise.resolve('0: Accepted for delivery');
  });

  jest.spyOn(axios, 'get').mockImplementation(fakeGet);

  const provider = new KannelSmsProvider({
    host: '127.0.0.1',
    port: '13000',
    from: '0000',
  });

  const testTo = '+7777';
  const testContent = 'This is a test';

  const testQueryParams = {
    from: '0000',
    text: testContent,
    to: testTo,
  };

  await provider.sendMessage({
    content: testContent,
    to: testTo,
  });

  expect(fakeGet).toHaveBeenCalled();
  expect(fakeGet).toHaveBeenCalledWith(
    'http://127.0.0.1:13000/cgi-bin/sendsms',
    {
      params: testQueryParams,
    }
  );
});
