import { ZenviaProvider } from './zenvia.provider';

test('should trigger zenvia library correctly with sms domain', async () => {
  const provider = new ZenviaProvider({
    apiKey: 'SG.',
  });

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        date: new Date().toISOString(),
        id: Math.ceil(Math.random() * 100),
      } as any;
    });

  await provider.sendMessage({
    content: {
      from: 'SMS Test',
      type_provider: 'SMS',
      contents: [
        {
          type: 'text',
          text: 'Test',
        },
      ],
    },
    to: '+2347063317344',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    content: {
      from: 'SMS Test',
      type_provider: 'SMS',
      contents: [
        {
          type: 'text',
          text: 'Test',
        },
      ],
    },
    to: '+2347063317344',
  });
});

test('should trigger zenvia library correctly with whatsapp domain', async () => {
  const provider = new ZenviaProvider({
    apiKey: 'SG.',
  });

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        date: new Date().toISOString(),
        id: Math.ceil(Math.random() * 100),
      } as any;
    });

  await provider.sendMessage({
    content: {
      from: 'Whatsapp Test',
      type_provider: 'WHATSAPP',
      contents: [
        {
          type: 'text',
          text: 'Test',
        },
      ],
    },
    to: '+2347063317344',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    content: {
      from: 'Whatsapp Test',
      type_provider: 'WHATSAPP',
      contents: [
        {
          type: 'text',
          text: 'Test',
        },
      ],
    },
    to: '+2347063317344',
  });
});
