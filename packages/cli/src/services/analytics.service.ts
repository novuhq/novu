import Analytics = require('analytics-node');
import { IJwtPayload } from '@novu/shared';
import { ANALYTICS_ENABLED, SEGMENTS_WRITE_KEY } from '../constants';

export enum AnalyticsEventEnum {
  EXISTING_ENVIRONMENT = 'existing_environment',
  SELF_HOSTED_DOCKER = 'self_hosted_docker',
  REJECTED_TERMS_AND_PRIVACY = 'rejected_terms_and_privacy',
  ACCOUNT_CREATED = 'account_created',
  OPENED_DASHBOARD_EXISTING_SESSION = 'opened_dashboard_existing_session',
  EXIT_EXISTING_SESSION = 'exit_existing_session',
  SKIP_TUTORIAL = 'skip_tutorial',
  COPY_SNIPPET = 'copy_snippet',
  TRIGGER_BUTTON = 'trigger_button',
}

export const ANALYTICS_SOURCE = '[CLI Onboarding]';

export class AnalyticService {
  private _analytics: Analytics;
  private _analyticsEnabled: boolean;

  constructor() {
    this._analyticsEnabled = ANALYTICS_ENABLED;
    if (this._analyticsEnabled) {
      this._analytics = new Analytics(SEGMENTS_WRITE_KEY);
    }
  }

  identify(user: IJwtPayload) {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    this._analytics.identify({
      userId: user._id,
      traits: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
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

    this._analytics.track({
      event: `${event} - ${ANALYTICS_SOURCE}`,
      ...identity,
      ...data,
    });
  }

  async flush() {
    if (!this.isAnalyticsEnabled()) {
      return;
    }

    await this._analytics.flush();
  }

  private isAnalyticsEnabled() {
    return this._analyticsEnabled;
  }
}
