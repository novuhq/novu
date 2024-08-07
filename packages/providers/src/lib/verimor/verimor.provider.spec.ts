import { VerimorSmsProvider } from './verimor.provider';

test.only('should trigger Verimor correctly', async () => {
  const provider = new VerimorSmsProvider({
    username: '+905555555555',
    password: 'the-password',
    from: 'My Company Name',
  });
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.verimorClient, 'send')
    .mockImplementation(async () => {
      return {
        id: 'the-id',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    source_addr: '+112345',
    messages: [
      {
        msg: 'SMS Content',
        dest: '+176543',
      },
    ],
  });
});
