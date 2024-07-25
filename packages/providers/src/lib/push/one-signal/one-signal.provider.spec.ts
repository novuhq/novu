import { OneSignalPushProvider } from './one-signal.provider';
import axios from 'axios';
import { IPushOptions } from '@novu/stateless';

jest.mock('axios');

const mockNotificationOptions: IPushOptions = {
  title: 'Test',
  content: 'Test push',
  target: ['tester'],
  payload: {
    sound: 'test_sound',
  },
  subscriber: {},
  step: {
    digest: false,
    events: [{}],
    total_count: 1,
  },
};

describe('test onesignal notification api', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
  });

  test('should trigger OneSignal library correctly', async () => {
    const provider = new OneSignalPushProvider({
      appId: 'test-app-id',
      apiKey: 'test-key',
    });

    const response = {
      data: {
        id: 'result',
      },
    };

    mockedAxios.request.mockResolvedValue(response);

    const spy = jest.spyOn(provider, 'sendMessage');

    const res = await provider.sendMessage(mockNotificationOptions);
    expect(mockedAxios.request).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(mockNotificationOptions);
    expect(res.id).toEqual(response.data.id);
  });
});
