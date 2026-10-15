/**
 * Signup funnel Mixpanel events, shared by every entry point (API, dashboard, Human dashboard)
 * so one event name covers inbox, agent, dashboard, CLI and Human signups.
 */
export const SIGNUP_ANALYTICS_EVENTS = {
  SIGNUP_STARTED: 'Signup Started',
  KEYLESS_ENVIRONMENT_CLAIMED: 'Keyless Environment Claimed',
} as const;

export enum SignupSourceEnum {
  INBOX = 'inbox',
  AGENT = 'agent',
  DASHBOARD = 'dashboard',
  CLI = 'cli',
  HUMAN = 'human',
}

/** Who created a keyless environment; claims report it as their `source`. */
export type KeylessCreationSource = SignupSourceEnum.INBOX | SignupSourceEnum.AGENT | SignupSourceEnum.HUMAN;

export const KEYLESS_CREATION_SOURCES: readonly KeylessCreationSource[] = [
  SignupSourceEnum.INBOX,
  SignupSourceEnum.AGENT,
  SignupSourceEnum.HUMAN,
];

export function isKeylessCreationSource(value: unknown): value is KeylessCreationSource {
  return typeof value === 'string' && (KEYLESS_CREATION_SOURCES as readonly string[]).includes(value);
}
