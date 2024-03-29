import { NtfyPushProvider } from './ntfy.provider';
import axios from 'axios';

jest.mock('axios');

describe('test onesignal notification api', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
  });

  test('should trigger ntfy library correctly', async () => {
    const provider = new NtfyPushProvider({
      topic: 'test',
    });

    const response = {
      data: {
        id: 'result',
      },
    };

    mockedAxios.request.mockResolvedValue(response);

    const spy = jest.spyOn(provider, 'sendMessage');

    const message = {
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      overrides: {
        clickAction: 'https://test.com',
      },
      payload: {},
      subscriber: {},
      step: {
        digest: false,
        events: [{}],
        total_count: 1,
      },
    };

    const res = await provider.sendMessage(message);
    expect(mockedAxios.request).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(message);
    expect(res.id).toEqual(response.data.id);
  });
});
