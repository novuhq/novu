import type { AnalyticsService } from '@novu/application-generic';
import { SIGNUP_ANALYTICS_EVENTS, SignUpOriginEnum, SignupSourceEnum } from '@novu/shared';

export function signupSourceForOrigin(origin: SignUpOriginEnum | undefined): SignupSourceEnum {
  return origin === SignUpOriginEnum.CLI ? SignupSourceEnum.CLI : SignupSourceEnum.DASHBOARD;
}

export function trackSignupStarted(
  analyticsService: AnalyticsService,
  distinctId: string,
  properties: { source: SignupSourceEnum } & Record<string, unknown>
): void {
  analyticsService.mixpanelTrack(SIGNUP_ANALYTICS_EVENTS.SIGNUP_STARTED, distinctId, properties);
}
