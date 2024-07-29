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

    const res = await provider.sendMessage(mockNotificationOptions, {
      iosBadgeCount: 2,
      includeExternalUserIds: ['test'],
    });
    expect(mockedAxios.request).toHaveBeenCalled();
    const data = JSON.parse(
      (mockedAxios.request.mock.calls[0][0].data as string) || '{}'
    );

    expect(data).toEqual({
      include_player_ids: ['tester'],
      app_id: 'test-app-id',
      headings: { en: 'Test' },
      contents: { en: 'Test push' },
      subtitle: {},
      data: { sound: 'test_sound' },
      ios_badge_type: 'Increase',
      ios_badgeCount: 2,
      ios_badge_count: 1,
      include_external_user_ids: ['test'],
    });

    expect(spy).toHaveBeenCalledWith(mockNotificationOptions, {
      iosBadgeCount: 2,
      includeExternalUserIds: ['test'],
    });
    expect(res.id).toEqual(response.data.id);
  });
});
