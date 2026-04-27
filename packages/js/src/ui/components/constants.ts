export const DEFAULT_MSTEAMS_CONNECTION_IDENTIFIER = 'chconn-msteams-default';
export const DEFAULT_SLACK_CONNECTION_IDENTIFIER = 'chconn-slack-default';

/**
 * Builds a per-subscriber default connection identifier so that multiple
 * subscribers in the same environment each get their own unique default,
 * avoiding 409 Conflict errors when no explicit connectionIdentifier is given.
 *
 * Falls back to the bare prefix when subscriberId is unavailable (e.g. shared
 * mode before a subscriberId is known).
 */
export function buildDefaultConnectionIdentifier(prefix: string, subscriberId: string | undefined): string {
  if (!subscriberId) {
    return prefix;
  }

  return `${prefix}-${subscriberId}`;
}
