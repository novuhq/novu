import type { IUserEntity } from '@novu/shared';
import { AnalyticsBrowser } from '@segment/analytics-next';
import * as Sentry from '@sentry/react';
// Default import. `import *` copies Mixpanel methods onto the module namespace, so
// `this.persistence` is missing and `alias()` throws `load_prop` into React.
import mixpanel from 'mixpanel-browser';
import { MIXPANEL_KEY, SEGMENT_KEY } from '@/config';

function reportAnalyticsFailure(error: unknown): void {
  console.error(error);

  try {
    Sentry.captureException(error);
  } catch {
    // Reporting an analytics failure must not become the failure.
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
}

function guardAnalytics(action: () => unknown): void {
  try {
    const result = action();

    if (isPromiseLike(result)) {
      void Promise.resolve(result).catch(reportAnalyticsFailure);
    }
  } catch (error) {
    reportAnalyticsFailure(error);
  }
}

export class SegmentService {
  private _segment: AnalyticsBrowser | null = null;

  private _segmentEnabled: boolean;

  public _mixpanelEnabled: boolean;

  constructor() {
    this._segmentEnabled = !!SEGMENT_KEY;
    this._mixpanelEnabled = !!MIXPANEL_KEY;

    if (this._mixpanelEnabled) {
      guardAnalytics(() => {
        mixpanel.init(MIXPANEL_KEY as string, {
          //@ts-expect-error missing from types
          record_sessions_percent: 100,
        });

        //@ts-expect-error missing from types
        mixpanel.start_session_recording();
      });
    }

    if (!this._segmentEnabled) {
      return;
    }

    try {
      this._segment = AnalyticsBrowser.load({
        writeKey: SEGMENT_KEY as string,
      });
    } catch (error) {
      reportAnalyticsFailure(error);
      this._segment = null;
      this._segmentEnabled = false;

      return;
    }

    if (!this._mixpanelEnabled) {
      return;
    }

    guardAnalytics(() => {
      this._segment?.addSourceMiddleware(({ payload, next }) => {
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
    });
  }

  identify(user: IUserEntity, extraProperties?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    guardAnalytics(() =>
      this._segment?.identify(user?._id, {
        email: user.email,
        name: user.firstName + ' ' + user.lastName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.profilePicture,
        ...(extraProperties || {}),
      })
    );
  }

  group(organization: { id: string; name: string; createdAt: string }, extraProperties?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    guardAnalytics(() =>
      this._segment?.group(organization.id, {
        name: organization.name,
        createdAt: organization.createdAt,
        ...(extraProperties || {}),
      })
    );
  }

  alias(anonymousId: string, userId: string) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    if (this._mixpanelEnabled) {
      guardAnalytics(() => {
        mixpanel.alias(userId, anonymousId);
      });
    }

    guardAnalytics(() => this._segment?.alias(userId, anonymousId));
  }

  setAnonymousId(anonymousId: string) {
    if (!this.isSegmentEnabled() || !anonymousId) {
      return;
    }

    guardAnalytics(() => this._segment?.setAnonymousId(anonymousId));
  }

  async track(event: string, data?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    let properties = data;

    if (this._mixpanelEnabled) {
      try {
        const sessionReplayProperties =
          //@ts-expect-error missing from types
          mixpanel.get_session_recording_properties();

        properties = {
          ...(data || {}),
          ...sessionReplayProperties,
        };
      } catch (error) {
        reportAnalyticsFailure(error);
      }
    }

    try {
      await this._segment?.track(event, properties);
    } catch (error) {
      reportAnalyticsFailure(error);
    }
  }

  pageView(url: string) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    guardAnalytics(() => this._segment?.pageView(url));
  }

  reset() {
    if (!this.isSegmentEnabled()) {
      return;
    }

    guardAnalytics(() => this._segment?.reset());
  }

  async getAnonymousId() {
    if (!this.isSegmentEnabled()) {
      return;
    }

    try {
      const user = await this._segment?.user();

      return user?.anonymousId();
    } catch (error) {
      reportAnalyticsFailure(error);

      return;
    }
  }

  isSegmentEnabled(): boolean {
    return this._segmentEnabled && this._segment !== null && typeof window !== 'undefined';
  }
}
