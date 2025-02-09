import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { Msg91SmsProvider } from './msg91-sms.provider';

test('should trigger Msg91 library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      message: '5e1e93cad6fc054d8e759a5b',
      type: 'success',
    },
  });

  const provider = new Msg91SmsProvider({
    authKey: '<msg91-auth-key>',
    apiUrl: 'https://webhook.site/eedde148-6fed-4b6b-abbc-5a1563a4de3c',
  });

  await provider.sendMessage({
    to: '+91XXXXXXXXXX',
    content: 'dkmu3ec0nallza0mkhcab0q4',
    customData: {
      variables: {
        var1: 'John Doe',
        var2: '1000',
      },
    },
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: {
      template_id: 'dkmu3ec0nallza0mkhcab0q4',
      recipients: [
        { mobiles: '+91XXXXXXXXXX', var1: 'John Doe', var2: '1000' },
      ],
    },
  });
});
