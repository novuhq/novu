import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - NotificationGroups class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should get notification groups correctly', async () => {
    mockedAxios.get.mockResolvedValue({});

    await novu.notificationGroups.get();

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/notification-groups');
  });

  test('should create notification groups correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationGroups.create('test');

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/notification-groups', {
      name: 'test',
    });
  });
});
