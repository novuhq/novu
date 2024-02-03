import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - ExecutionDetails class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should get execution details correctly', async () => {
    const notificationId = '12345678';
    const subscriberId = '987654321';
    mockedAxios.get.mockResolvedValue({});

    await novu.executionDetails.get({ notificationId, subscriberId });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/execution-details', {
      params: { notificationId: '12345678', subscriberId: '987654321' },
    });
  });
});
