import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - Changes class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should get changes correctly', async () => {
    const page = 1;
    const limit = 20;
    const promoted = false;

    mockedAxios.post.mockResolvedValue({});

    await novu.changes.get({ page, limit, promoted });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/changes', {
      params: {
        limit: 20,
        page: 1,
        promoted: false,
      },
    });
  });

  test('should get count of changes correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.changes.getCount();

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/changes/count');
  });

  test('should apply one change', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.changes.applyOne('change1');

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/changes/change1/apply', {});
  });

  test('should apply one change', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.changes.applyMany(['changeID', 'change2ID']);

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/changes/bulk/apply', {
      changeIds: ['changeID', 'change2ID'],
    });
  });
});
