import { Novu } from './novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};
jest.mock('axios');

test('should trigger correctly', async () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  mockedAxios.create.mockReturnThis();

  const novu = new Novu(mockConfig.apiKey);

  mockedAxios.post.mockResolvedValue({});

  await novu.trigger('test-template', {
    $user_id: 'test-user',
    $email: 'test-user@sd.com',
  });

  expect(mockedAxios.post).toHaveBeenCalled();
  expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
    name: 'test-template',
    payload: {
      $user_id: 'test-user',
      $email: 'test-user@sd.com',
    },
  });
});

test('should identify subscriber correctly', async () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  mockedAxios.create.mockReturnThis();

  const novu = new Novu(mockConfig.apiKey);

  mockedAxios.post.mockResolvedValue({});

  await novu.subscribers.identify('test-new-subscriber', {
    firstName: 'Test',
    lastName: 'Identify',
    email: 'email',
  });

  expect(mockedAxios.post).toHaveBeenCalled();
  expect(mockedAxios.post).toHaveBeenCalledWith('/subscribers', {
    subscriberId: 'test-new-subscriber',
    firstName: 'Test',
    lastName: 'Identify',
    email: 'email',
  });
});

test('should update subscriber correctly', async () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  mockedAxios.create.mockReturnThis();

  const novu = new Novu(mockConfig.apiKey);

  mockedAxios.put.mockResolvedValue({});

  await novu.subscribers.update('test-update-subscriber', {
    phone: '8989898',
  });

  expect(mockedAxios.put).toHaveBeenCalled();
  expect(mockedAxios.put).toHaveBeenCalledWith(
    `/subscribers/test-update-subscriber`,
    {
      phone: '8989898',
    }
  );
});
