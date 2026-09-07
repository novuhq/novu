export const ONBOARDING_SESSION_ID_PARAM = 'onboarding_session_id';

export function readOnboardingSessionId(search: URLSearchParams): string | undefined {
  const raw = search.get(ONBOARDING_SESSION_ID_PARAM)?.trim();

  return raw || undefined;
}
