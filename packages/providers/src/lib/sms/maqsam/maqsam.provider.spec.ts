import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { MaqsamSmsProvider } from './maqsam.provider';

test('should trigger Maqsam correctly', async () => {
  const { mockRequest: spy } = axiosSpy({
    data: {
      message: {
        identifier: '23937e6e6ea74726b659aba17d4d73aa',
        timestamp: 1679313103,
      },
    },
  });
  const provider = new MaqsamSmsProvider({
    accessKeyId: '<maqsam-access-key-id>',
    accessSecret: '<maqsam-access-secret>',
    from: 'sender-id',
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

test('should trigger Maqsam correctly with _passthrough', async () => {
  const { mockRequest: spy } = axiosSpy({
    data: {
      message: {
        identifier: '23937e6e6ea74726b659aba17d4d73aa',
        timestamp: 1679313103,
      },
    },
  });
  const provider = new MaqsamSmsProvider({
    accessKeyId: '<maqsam-access-key-id>',
    accessSecret: '<maqsam-access-secret>',
    from: 'sender-id',
  });

  await provider.sendMessage(
    {
      to: '+176543',
      content: 'SMS Content',
    },
    {
      _passthrough: {
        body: {
          to: '+276543',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: {
      to: '+276543',
      message: 'SMS Content',
      sender: 'sender-id',
    },
  });
});
