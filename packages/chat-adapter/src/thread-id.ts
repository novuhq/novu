import type { NovuThreadId } from './types.js';

/**
 * Thread ids are packed as five colon-separated, URL-encoded segments:
 *
 *   `novu:<platform>:<integrationIdentifier>:<conversationId>:<dm>`
 *
 * Packing platform + isDM into the id keeps `channelIdFromThreadId()` and
 * `isDM()` fully stateless and synchronous — no state lookup required at routing
 * time. The `dm` segment is `'1'` for direct messages and `'0'` otherwise.
 */
const PREFIX = 'novu';

export function encodeThreadId(data: NovuThreadId): string {
  return [
    PREFIX,
    encodeURIComponent(data.platform),
    encodeURIComponent(data.integrationIdentifier),
    encodeURIComponent(data.conversationId),
    data.isDM ? '1' : '0',
  ].join(':');
}

export function decodeThreadId(threadId: string): NovuThreadId {
  const parts = threadId.split(':');
  if (parts.length !== 5 || parts[0] !== PREFIX || !parts[2] || !parts[3]) {
    throw new Error(`Invalid Novu thread id format: ${threadId}`);
  }

  return {
    platform: decodeURIComponent(parts[1] ?? ''),
    integrationIdentifier: decodeURIComponent(parts[2]),
    conversationId: decodeURIComponent(parts[3]),
    isDM: parts[4] === '1',
  };
}

export function channelIdFromThreadId(threadId: string): string {
  const { platform, integrationIdentifier } = decodeThreadId(threadId);

  return `${PREFIX}:${platform}:${integrationIdentifier}`;
}

export function isDMThreadId(threadId: string): boolean {
  return decodeThreadId(threadId).isDM;
}
