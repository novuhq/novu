import { AnalyticsBrowser } from '@segment/analytics-next';
import type { IUserEntity } from '@novu/shared';
import * as mixpanel from 'mixpanel-browser';
import { MIXPANEL_KEY, SEGMENT_KEY } from '@/config';

export class SegmentService {
  private _segment: AnalyticsBrowser | null = null;
  private _segmentEnabled: boolean;
  public _mixpanelEnabled: boolean;

  constructor() {
    this._segmentEnabled = !!SEGMENT_KEY;
    this._mixpanelEnabled = !!MIXPANEL_KEY;

    if (this._mixpanelEnabled) {
      mixpanel.init(MIXPANEL_KEY as string, {
        //@ts-expect-error missing from types
        record_sessions_percent: 100,
      });
    }

    if (this._segmentEnabled) {
      this._segment = AnalyticsBrowser.load({
        writeKey: SEGMENT_KEY as string,
      });
      if (!this._mixpanelEnabled) {
        return;
      }
      this._segment.addSourceMiddleware(({ payload, next }) => {
        try {
          if (payload.type() === 'track' || payload.type() === 'page') {
            const segmentDeviceId = payload.obj.anonymousId;
            mixpanel.register({ $device_id: segmentDeviceId });
            const sessionReplayProperties =
              //@ts-expect-error missing from types
              mixpanel.get_session_recording_properties();
            payload.obj.properties = {
              ...payload.obj.properties,
              ...sessionReplayProperties,
            };
          }
          const { userId } = payload.obj;
          if (payload.type() === 'identify' && userId) {
            mixpanel.identify(userId);
          }
        } catch (e) {
          console.error(e);
        }
        next(payload);
      });
    }
  }

  identify(user: IUserEntity) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.identify(user?._id, {
      email: user.email,
      name: user.firstName + ' ' + user.lastName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.profilePicture,
    });
  }

  alias(anonymousId: string, userId: string) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    if (this._mixpanelEnabled) {
      mixpanel.alias(userId, anonymousId);
    }

    this._segment?.alias(userId, anonymousId);
  }

  setAnonymousId(anonymousId: string) {
    if (!this.isSegmentEnabled() || !anonymousId) {
      return;
    }

    this._segment?.setAnonymousId(anonymousId);
  }

  // @ts-expect-error event is unused at the moment until we do the /v1/telemetry/measure API call
  async track(event: string, data?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    if (this._mixpanelEnabled) {
      const sessionReplayProperties =
        //@ts-expect-error missing from types
        mixpanel.get_session_recording_properties();

      data = {
        ...(data || {}),
        ...sessionReplayProperties,
      };
    }

    // TODO: Add api call
    // await api.post("/v1/telemetry/measure", {
    //   event: `${event} - [WEB]`,
    //   data,
    // });
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
