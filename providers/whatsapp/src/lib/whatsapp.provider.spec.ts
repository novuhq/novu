import { WhatsappProvider } from './whatsapp.provider';

test('should trigger whatsapp correctly', async () => {
  const provider = new WhatsappProvider({
    phoneNumberId: 'phoneNumberId_123',
    token: 'tokenNumber',
  });
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        dateCreated: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '123456789',
    content: 'chat message',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '123456789',
    content: 'chat message',
  });
});
