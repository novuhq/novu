import type { ConnectionMode } from '../../channel-connections/types';

export const DEFAULT_MSTEAMS_CONNECTION_IDENTIFIER = 'chconn-msteams-default';
export const DEFAULT_SLACK_CONNECTION_IDENTIFIER = 'chconn-slack-default';

export function buildDefaultConnectionIdentifier(
  prefix: string,
  connectionMode: ConnectionMode,
  subscriberId: string | undefined
): string | undefined {
  if (connectionMode === 'shared') {
    return prefix;
  }
  if (subscriberId === undefined) {
    return undefined;
  }

  return subscriberId ? `${prefix}-${subscriberId}` : prefix;
}
