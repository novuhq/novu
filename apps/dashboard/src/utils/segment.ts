import { MIXPANEL_KEY, SEGMENT_KEY } from '@/config';
import type { IUserEntity } from '@novu/shared';
import { AnalyticsBrowser } from '@segment/analytics-next';
import * as Sentry from '@sentry/react';
import * as mixpanel from 'mixpanel-browser';

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

      try {
        //@ts-expect-error missing from types
        mixpanel.start_session_recording();
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
      }
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

  identify(user: IUserEntity, extraProperties?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.identify(user?._id, {
      email: user.email,
      name: user.firstName + ' ' + user.lastName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.profilePicture,
      ...(extraProperties || {}),
    });
  }

  group(organization: { id: string; name: string; createdAt: string }, extraProperties?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.group(organization.id, {
      name: organization.name,
      createdAt: organization.createdAt,
      ...(extraProperties || {}),
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

    this._segment?.track(event, data);
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

  async getAnonymousId() {
    if (!this.isSegmentEnabled()) {
      return;
    }

    const user = await this._segment?.user();

    return user?.anonymousId();
  }

  isSegmentEnabled(): boolean {
    return this._segmentEnabled && this._segment !== null && typeof window !== 'undefined';
  }
}
