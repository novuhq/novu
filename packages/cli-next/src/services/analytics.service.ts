import { Analytics } from '@segment/analytics-node';
import { UserSessionData } from '@novu/shared';
import { ANALYTICS_ENABLED, SEGMENTS_WRITE_KEY } from '../constants';

export const ANALYTICS_SOURCE = '[Echo CLI]';

export class AnalyticService {
  private _analytics: Analytics;
  private _analyticsEnabled: boolean;

  constructor() {
    this._analyticsEnabled = ANALYTICS_ENABLED;
    if (this._analyticsEnabled) {
      this._analytics = new Analytics({
        writeKey: SEGMENTS_WRITE_KEY,
      });
    }
  }

  alias({ previousId, userId }: { previousId: string; userId: string }) {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    this._analytics.alias({
      previousId,
      userId,
    });
  }

  identify(user: UserSessionData) {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    this._analytics.identify({
      userId: user._id,
      traits: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        created: (user as any).createdAt,
      },
    });
  }

  track({
    data,
    event,
    identity,
  }: {
    data?: Record<string, unknown>;
    event: string;
    identity: { userId: string } | { anonymousId: string };
  }) {
    if (!this.isAnalyticsEnabled()) {
      return;
    }
    const payload = {
      event: `${event} - ${ANALYTICS_SOURCE}`,
      ...identity,
      properties: {},
    };

    if (data) {
      payload.properties = { ...payload.properties, ...data };
    }

    this._analytics.track(payload);
  }

  async flush() {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    await this._analytics.closeAndFlush();
  }

  private isAnalyticsEnabled() {
    return this._analyticsEnabled;
  }
}
