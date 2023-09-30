import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('Use of Novu node package - Feeds class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should get Feeds correctly', async () => {
    mockedAxios.get.mockResolvedValue({});

    await novu.feeds.get();

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/feeds');
  });

  test('should create feed correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.feeds.create('test-feeds');

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/feeds', {
      name: 'test-feeds',
    });
  });

  test('should delete feed correctly', async () => {
    mockedAxios.delete.mockResolvedValue({});

    await novu.feeds.delete('test-feeds');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(`/feeds/test-feeds`);
  });
});
