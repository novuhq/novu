import axios from 'axios';
import { ListmonkEmailProvider } from './listmonkEmail.provider';

test('should trigger Listmonk Email axios request correctly', async () => {
  const fakePost = jest.fn(() => {
    return Promise.resolve({ data: true });
  });

  jest.spyOn(axios, 'post').mockImplementation(fakePost);

  const provider = new ListmonkEmailProvider({
    host: '0.0.0.0',
    port: '9000',
    username: 'listmonk',
    password: 'listmonk',
    templateId: 2,
  });

  const testTo = 'johndoe@example.com';
  const testFrom = 'janedoe@example.com';

  await provider.sendMessage({
    to: testTo,
    from: testFrom,
    subject: '',
    html: '',
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    'http://0.0.0.0:9000/api/tx',
    {
      templateId: 2,
      subscriber_email: testTo,
      from_email: testFrom,
    },
    {
      auth: {
        username: 'listmonk',
        password: 'listmonk',
      },
    }
  );
});
