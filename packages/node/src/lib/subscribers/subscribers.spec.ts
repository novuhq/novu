import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - Subscribers class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
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

  test('should update subscriber channel credentials correctly', async () => {
    mockedAxios.put.mockResolvedValue({});

    const credentials = {
      webhookUrl: 'webhookUrl',
    };

    await novu.subscribers.setCredentials(
      'test-update-subscriber',
      'slack',
      credentials
    );

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      `/subscribers/test-update-subscriber/credentials`,
      {
        channel: {
          providerId: 'slack',
          credentials: {
            webhookUrl: 'webhookUrl',
          },
        },
      }
    );
  });
});
