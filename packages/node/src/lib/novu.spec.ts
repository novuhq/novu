import { Novu } from './novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test initialization of novu node package', () => {
  let novu: Novu;

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NOVU_API_KEY: 'cafebabe',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should use the NOVU_API_KEY when defined', async () => {
    expect(new Novu().apiKey).toBe('cafebabe');
  });

  test('should use the NOVU_API_KEY when defined', async () => {
    expect(new Novu('whatever').apiKey).toBe('whatever');
  });
});

describe('test use of novu node package', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should trigger correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.trigger('test-template', {
      to: 'test-user',
      payload: {
        email: 'test-user@sd.com',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: 'test-user',
      overrides: {},
      payload: {
        email: 'test-user@sd.com',
      },
    });
  });

  test('should broadcast correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.broadcast('test-template', {
      payload: {
        email: 'test-user@sd.com',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger/broadcast', {
      name: 'test-template',
      overrides: {},
      payload: {
        email: 'test-user@sd.com',
      },
    });
  });

  test('should trigger correctly for all subscribers definitions ', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.trigger('test-template', {
      to: ['test-user', 'test-another-user'],
      payload: {
        organizationName: 'Company',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: ['test-user', 'test-another-user'],
      overrides: {},
      payload: {
        organizationName: 'Company',
      },
    });

    await novu.trigger('test-template', {
      to: [
        { subscriberId: 'test-user', firstName: 'test' },
        { subscriberId: 'test-another-user' },
      ],
      payload: {
        organizationName: 'Company',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: [
        { subscriberId: 'test-user', firstName: 'test' },
        { subscriberId: 'test-another-user' },
      ],
      overrides: {},
      payload: {
        organizationName: 'Company',
      },
    });
  });
});
