export const UTM_CAMPAIGN_QUERY_PARAM = '?utm_campaign=in-app';

export const TRIAL_JOURNEY_INBOX_EMAIL_UTM = {
  utm_source: 'nurturing',
  utm_medium: 'email',
  utm_campaign: 'trial-journey',
  utm_content: '02-inbox-v1',
} as const;

/** Root dashboard URL for the trial journey "Connect your Inbox" marketing CTA. */
export function buildTrialJourneyDashboardUrl(baseUrl: string): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(TRIAL_JOURNEY_INBOX_EMAIL_UTM)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
