import { MaqsamSmsProvider } from './maqsam.provider';

test('should trigger Maqsam correctly', async () => {
  const provider = new MaqsamSmsProvider({
    accessKeyId: '<maqsam-access-key-id>',
    accessSecret: '<maqsam-access-secret>',
    from: 'sender-id',
  });
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.axiosInstance, 'request')
    .mockImplementation(async () => {
      return {
        data: {
          message: {
            identifier: '23937e6e6ea74726b659aba17d4d73aa',
            timestamp: 1679313103,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: {
      to: '+176543',
      message: 'SMS Content',
      sender: 'sender-id',
    },
  });
});
