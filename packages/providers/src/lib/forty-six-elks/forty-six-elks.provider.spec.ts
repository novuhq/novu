import axios from 'axios';
import { FortySixElksSmsProvider } from './forty-six-elks.provider';

test('should trigger 46elks api correctly', async () => {
  const spy = jest.spyOn(axios, 'post').mockImplementation(async () => {
    return {
      data: {
        id: 'test_id',
        created: new Date().toISOString(),
      },
    };
  });

  const to = '+467777777777';
  const from = 'Company';
  const content = 'Test';

  const provider = new FortySixElksSmsProvider({
    user: 'test_account',
    password: '123456',
    from,
  });

  const response = await provider.sendMessage({
    to,
    from,
    content,
  });

  expect(response?.id).toEqual('test_id');
  expect(spy).toHaveBeenCalledWith(
    'https://api.46elks.com/a1/sms',
    `from=${from}&to=${to.replace('+', '%2B')}&message=${content}`,
    { headers: { Authorization: 'Basic dGVzdF9hY2NvdW50OjEyMzQ1Ng==' } }
  );
});
