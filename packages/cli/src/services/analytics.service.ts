import { Analytics } from '@segment/analytics-node';
import { IJwtPayload } from '@novu/shared';
import { ANALYTICS_ENABLED, SEGMENTS_WRITE_KEY } from '../constants';

export enum AnalyticsEventEnum {
  ENVIRONMENT_SELECT_EVENT = 'Select Install Environment',
  CREATE_APP_QUESTION_EVENT = 'Create App Question',
  REGISTER_METHOD_SELECT_EVENT = 'Select Register Method',
  TERMS_AND_CONDITIONS_QUESTION = 'Terms And Conditions Question',
  PRIVATE_EMAIL_ATTEMPT = 'Private Email Register Attempt',
  ACCOUNT_CREATED = 'account_created',
  OPEN_DASHBOARD = 'open_dashboard',
  DASHBOARD_PAGE_OPENED = 'Dashboard Page Opened',
  EXIT_EXISTING_SESSION = 'exit_existing_session',
  SKIP_TUTORIAL = 'skip_tutorial',
  COPY_SNIPPET = 'copy_snippet',
  TRIGGER_BUTTON = 'trigger_button',
  CLI_LAUNCHED = 'Cli Launched',
}

export const ANALYTICS_SOURCE = '[CLI Onboarding]';

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
