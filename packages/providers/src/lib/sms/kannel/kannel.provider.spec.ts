import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { KannelSmsProvider } from './kannel.provider';

test('should trigger Kannel SMS axios request correctly', async () => {
  const { mockGet: fakeGet } = axiosSpy({
    data: '0: Accepted for delivery',
  });

  const provider = new KannelSmsProvider({
    host: '0.0.0.0',
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
  expect(fakeGet).toHaveBeenCalledWith('http://0.0.0.0:13000/cgi-bin/sendsms', {
    params: testQueryParams,
  });
});

test('should trigger Kannel SMS axios request correctly with _passthrough', async () => {
  const { mockGet: fakeGet } = axiosSpy({
    data: '0: Accepted for delivery',
  });

  const provider = new KannelSmsProvider({
    host: '0.0.0.0',
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

  await provider.sendMessage(
    {
      content: testContent,
      to: testTo,
    },
    {
      _passthrough: {
        body: {
          from: '1000',
        },
      },
    }
  );

  expect(fakeGet).toHaveBeenCalled();
  expect(fakeGet).toHaveBeenCalledWith('http://0.0.0.0:13000/cgi-bin/sendsms', {
    params: {
      ...testQueryParams,
      from: '1000',
    },
  });
});

test.each([
  ['0.0.0.0', '443', 'http://0.0.0.0:443/cgi-bin/sendsms'],
  ['https://kannel.example.com', '8443', 'https://kannel.example.com:8443/cgi-bin/sendsms'],
  ['https://kannel.example.com/', '443', 'https://kannel.example.com/cgi-bin/sendsms'],
  ['https://kannel.example.com:8443', '8443', 'https://kannel.example.com:8443/cgi-bin/sendsms'],
  ['http://kannel.example.com', '13013', 'http://kannel.example.com:13013/cgi-bin/sendsms'],
])('should build the Kannel URL from host %s and port %s', async (host, port, expectedUrl) => {
  const { mockGet: fakeGet } = axiosSpy({
    data: '0: Accepted for delivery',
  });

  const provider = new KannelSmsProvider({ host, port, from: '0000' });

  await provider.sendMessage({ content: 'This is a test', to: '+7777' });

  expect(fakeGet).toHaveBeenCalledWith(expectedUrl, {
    params: { from: '0000', text: 'This is a test', to: '+7777' },
  });
});
