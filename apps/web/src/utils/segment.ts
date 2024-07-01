import { AnalyticsBrowser } from '@segment/analytics-next';
import { IUserEntity } from '@novu/shared';
import * as mixpanel from 'mixpanel-browser';
import { UseMutateFunction } from '@tanstack/react-query';

type TrackFunction = UseMutateFunction<
  any,
  unknown,
  {
    event: string;
    data?: Record<string, unknown> | undefined;
  },
  unknown
>;

export class SegmentService {
  private _segment: AnalyticsBrowser | null = null;
  private readonly _trackFunction: TrackFunction;
  private _segmentEnabled: boolean;
  public _mixpanelEnabled: boolean;

  constructor(trackFunction: TrackFunction) {
    this._trackFunction = trackFunction;
    this._segmentEnabled = !!process.env.REACT_APP_SEGMENT_KEY;
    this._mixpanelEnabled = !!process.env.REACT_APP_MIXPANEL_KEY;

    if (this._mixpanelEnabled) {
      mixpanel.init(process.env.REACT_APP_MIXPANEL_KEY as string, {
        record_sessions_percent: 100,
      });
    }

    if (this._segmentEnabled) {
      this._segment = AnalyticsBrowser.load({ writeKey: process.env.REACT_APP_SEGMENT_KEY as string });
      if (!this._mixpanelEnabled) {
        return;
      }
      this._segment.addSourceMiddleware(({ payload, next }) => {
        try {
          if (payload.type() === 'track' || payload.type() === 'page') {
            const segmentDeviceId = payload.obj.anonymousId;
            mixpanel.register({ $device_id: segmentDeviceId });
            const sessionReplayProperties = mixpanel.get_session_recording_properties();
            payload.obj.properties = {
              ...payload.obj.properties,
              ...sessionReplayProperties,
            };
          }
          const userId = payload.obj.userId;
          if (payload.type() === 'identify' && userId) {
            mixpanel.identify(userId);
          }
        } catch (e) {}
        next(payload);
      });
    }
  }

  identify(user: IUserEntity) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.identify(user?._id);
  }

  async track(event: string, data?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    if (this._mixpanelEnabled) {
      const segmentDeviceId = localStorage.getItem('ajs_anonymous_id');
      mixpanel.register({ $device_id: segmentDeviceId });
      const sessionReplayProperties = mixpanel.get_session_recording_properties();

      data = {
        ...(data || {}),
        ...sessionReplayProperties,
      };
    }

    await this._trackFunction({
      event: event + ' - [WEB]',
      data,
    });
  }

  pageView(url: string) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.pageView(url);
  }

  reset() {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.reset();
  }

  isSegmentEnabled(): boolean {
    return this._segmentEnabled && this._segment !== null && typeof window !== 'undefined';
  }
}
