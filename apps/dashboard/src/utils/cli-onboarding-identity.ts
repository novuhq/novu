const CLI_ONBOARDING_SESSION_KEY = 'novu.cli.onboardingSessionId';

export function persistCliOnboardingSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(CLI_ONBOARDING_SESSION_KEY, sessionId);
  } catch {
    // sessionStorage unavailable — alias will rely on URL param on /cli/auth only
  }
}

export function readPersistedCliOnboardingSessionId(): string | undefined {
  try {
    const raw = sessionStorage.getItem(CLI_ONBOARDING_SESSION_KEY)?.trim();

    return raw || undefined;
  } catch {
    return undefined;
  }
}

export function clearPersistedCliOnboardingSessionId(): void {
  try {
    sessionStorage.removeItem(CLI_ONBOARDING_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function readActiveCliOnboardingSessionId(urlSessionId?: string): string | undefined {
  return urlSessionId ?? readPersistedCliOnboardingSessionId();
}
