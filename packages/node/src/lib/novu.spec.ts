import { Novu } from './novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

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
      payload: {
        organizationName: 'Company',
      },
    });
  });

  test('should identify subscriber correctly', async () => {
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

  test('should update subscriber correctly', async () => {
    mockedAxios.delete.mockResolvedValue({});

    await novu.subscribers.delete('test-delete-subscriber');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      `/subscribers/test-delete-subscriber`
    );
  });
});
