import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('Novu Node.js package - Tenants class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  const methods = ['get', 'post', 'put', 'delete', 'patch'];

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  afterEach(() => {
    methods.forEach((method) => {
      mockedAxios[method].mockClear();
    });
  });

  test('should create tenant', async () => {
    const identifier = 'tenant-identifier';
    const name = 'tenant-name';
    const data = { address: 'UK', email: 'test@email.co' };

    mockedAxios.post.mockResolvedValue({});

    await novu.tenants.create(identifier, {
      name,
      data,
    });
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/tenants', {
      identifier,
      name,
      data,
    });
  });

  test('should update tenant', async () => {
    await novu.tenants.update('test-identifier', {
      identifier: 'updated-identifier',
      name: 'new name',
      data: { count: 8 },
    });

    mockedAxios.patch.mockResolvedValue({});

    expect(mockedAxios.patch).toHaveBeenCalled();
    expect(mockedAxios.patch).toHaveBeenCalledWith('/tenants/test-identifier', {
      identifier: 'updated-identifier',
      name: 'new name',
      data: { count: 8 },
    });
  });

  test('should delete tenant by the identifier', async () => {
    const mockedResponse = {};
    mockedAxios.delete.mockResolvedValue(mockedResponse);

    await novu.tenants.delete('test-identifier');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith('/tenants/test-identifier');
  });

  test('should get tenant by the identifier', async () => {
    mockedAxios.get.mockResolvedValue({});

    await novu.tenants.get('test-identifier');

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/tenants/test-identifier');
  });

  test('should list tenants', async () => {
    mockedAxios.get.mockResolvedValue({});

    await novu.tenants.list({ page: 0, limit: 10 });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/tenants', {
      params: { page: 0, limit: 10 },
    });
  });
});
