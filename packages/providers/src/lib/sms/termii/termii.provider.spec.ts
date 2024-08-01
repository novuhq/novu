import fetchMock from 'fetch-mock';
import { TermiiSmsProvider } from './termii.provider';

afterEach(() => {
  fetchMock.reset();
});

test('should trigger termii library correctly', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  fetchMock.mock('*', {
    body: {
      message_id: '1',
    },
  });

  await provider.sendMessage({
    content: 'Your otp code is 32901',
    from: 'TermiiTest',
    to: '+2347063317344',
  });

  expect(fetchMock.calls()[0][1].body).toEqual(
    '{"to":"+2347063317344","from":"TermiiTest","sms":"Your otp code is 32901","type":"plain","channel":"generic","api_key":"SG."}'
  );
});

test('should trigger termii library correctly with _passthrough', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  fetchMock.mock('*', {
    body: {
      message_id: '1',
    },
  });

  await provider.sendMessage(
    {
      content: 'Your otp code is 32901',
      from: 'TermiiTest',
      to: '+2347063317344',
    },
    {
      _passthrough: {
        body: {
          to: '+3347063317344',
        },
      },
    }
  );

  expect(fetchMock.calls()[0][1].body).toEqual(
    '{"to":"+3347063317344","from":"TermiiTest","sms":"Your otp code is 32901","type":"plain","channel":"generic","api_key":"SG."}'
  );
});
