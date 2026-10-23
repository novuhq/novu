import { AnalyticsBrowser } from '@segment/analytics-next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SegmentService } from './segment';

const { mixpanelMock, segmentClient, captureException } = vi.hoisted(() => {
  const mixpanelMock = {
    init: vi.fn(),
    start_session_recording: vi.fn(),
    alias: vi.fn(),
    register: vi.fn(),
    identify: vi.fn(),
    get_session_recording_properties: vi.fn(() => ({ $mp_replay_id: 'replay' })),
  };

  const segmentClient = {
    identify: vi.fn(() => Promise.resolve()),
    group: vi.fn(() => Promise.resolve()),
    alias: vi.fn(() => Promise.resolve()),
    setAnonymousId: vi.fn(() => Promise.resolve()),
    track: vi.fn(() => Promise.resolve()),
    pageView: vi.fn(() => Promise.resolve()),
    reset: vi.fn(() => Promise.resolve()),
    user: vi.fn(async () => ({ anonymousId: () => 'anon-from-segment' })),
    addSourceMiddleware: vi.fn(),
  };

  return {
    mixpanelMock,
    segmentClient,
    captureException: vi.fn(),
  };
});

vi.mock('mixpanel-browser', () => ({
  default: mixpanelMock,
}));

vi.mock('@segment/analytics-next', () => ({
  AnalyticsBrowser: {
    load: vi.fn(() => segmentClient),
  },
}));

vi.mock('@sentry/react', () => ({
  captureException,
}));

vi.mock('@/config', () => ({
  MIXPANEL_KEY: 'mixpanel-test-key',
  SEGMENT_KEY: 'segment-test-key',
}));

describe('SegmentService', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
    vi.clearAllMocks();
    mixpanelMock.init.mockImplementation(() => undefined);
    mixpanelMock.start_session_recording.mockImplementation(() => undefined);
    mixpanelMock.alias.mockImplementation(() => undefined);
    mixpanelMock.get_session_recording_properties.mockReturnValue({ $mp_replay_id: 'replay' });
    segmentClient.alias.mockResolvedValue(undefined);
    segmentClient.track.mockResolvedValue(undefined);
    segmentClient.identify.mockResolvedValue(undefined);
    segmentClient.user.mockResolvedValue({ anonymousId: () => 'anon-from-segment' });
  });

  it('keeps calling Segment when Mixpanel alias throws load_prop', async () => {
    mixpanelMock.alias.mockImplementation(() => {
      throw new TypeError("Cannot read properties of undefined (reading 'load_prop')");
    });

    const service = new SegmentService();

    expect(() => service.alias('anon-id', 'user-id')).not.toThrow();
    expect(segmentClient.alias).toHaveBeenCalledWith('user-id', 'anon-id');
    expect(captureException).toHaveBeenCalled();

    await Promise.resolve();
  });

  it('does not throw when Mixpanel fails while the service is constructed', () => {
    mixpanelMock.start_session_recording.mockImplementation(() => {
      throw new TypeError("Cannot read properties of undefined (reading 'recorder_src')");
    });

    expect(() => new SegmentService()).not.toThrow();
    expect(AnalyticsBrowser.load).toHaveBeenCalled();
  });

  it('swallows a rejected Segment alias', async () => {
    segmentClient.alias.mockRejectedValue(new Error('segment down'));

    const service = new SegmentService();
    service.alias('anon-id', 'user-id');

    await vi.waitFor(() => {
      expect(captureException).toHaveBeenCalled();
    });
  });

  it('still tracks when session replay properties throw', async () => {
    mixpanelMock.get_session_recording_properties.mockImplementation(() => {
      throw new Error('recorder unavailable');
    });

    const service = new SegmentService();
    await expect(service.track('CLI Auth Page Viewed', { callerName: 'novu-connect' })).resolves.toBeUndefined();

    expect(segmentClient.track).toHaveBeenCalledWith('CLI Auth Page Viewed', { callerName: 'novu-connect' });
  });

  it('returns undefined when reading the anonymous id fails', async () => {
    segmentClient.user.mockRejectedValue(new Error('storage blocked'));

    const service = new SegmentService();

    await expect(service.getAnonymousId()).resolves.toBeUndefined();
  });
});
