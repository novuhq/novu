import Analytics from '@segment/analytics-node';
import { v4 as uuidv4 } from 'uuid';
import { ANALYTICS_ENABLED, SEGMENTS_WRITE_KEY } from '../constants';

const ANALYTICS_SOURCE = '[CLI add-inbox]';

export enum AnalyticsEventEnum {
  CLI_STARTED = 'CLI add-inbox Started',
  CLI_USER_CANCELLED = 'CLI add-inbox User Cancelled',
  CLI_COMPLETED = 'CLI add-inbox Completed',
  CLI_ERROR = 'CLI add-inbox Error',
}

interface IAnalyticsIdentity {
  userId?: string;
  anonymousId?: string;
}

export class AnalyticsService {
  private _analytics?: Analytics;
  private _analyticsEnabled: boolean;
  private _anonymousId: string;

  constructor(subscriberId?: string) {
    this._analyticsEnabled = ANALYTICS_ENABLED;
    this._anonymousId = typeof subscriberId === 'string' && subscriberId ? subscriberId : uuidv4();

    if (this._analyticsEnabled && SEGMENTS_WRITE_KEY) {
      this._analytics = new Analytics({
        writeKey: SEGMENTS_WRITE_KEY,
      });
    }
  }

  track({
    event,
    data,
    identity,
  }: {
    event: AnalyticsEventEnum;
    data?: Record<string, unknown>;
    identity?: IAnalyticsIdentity;
  }) {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    try {
      const payload = {
        event: `${event} - ${ANALYTICS_SOURCE}`,
        anonymousId: identity?.anonymousId || this._anonymousId,
        userId: identity?.userId,
        properties: data || {},
      };

      this._analytics?.track(payload);
    } catch (error) {
      // Silently fail - we don't want analytics errors to affect the CLI
      console.error('Analytics error:', error);
    }
  }

  identify(user: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    createdAt: string;
  }) {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    try {
      this._analytics?.identify({
        userId: user._id,
        traits: {
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.profilePicture,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Analytics identify error:', error);
    }
  }

  alias({ previousId, userId }: { previousId: string; userId: string }) {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    try {
      this._analytics?.alias({
        previousId,
        userId,
      });
    } catch (error) {
      console.error('Analytics alias error:', error);
    }
  }

  async flush() {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    try {
      await this._analytics?.closeAndFlush();
    } catch (error) {
      // Silently fail - we don't want analytics errors to affect the CLI
      console.error('Analytics flush error:', error);
    }
  }

  private isAnalyticsEnabled() {
    return this._analyticsEnabled && !!SEGMENTS_WRITE_KEY;
  }
}
