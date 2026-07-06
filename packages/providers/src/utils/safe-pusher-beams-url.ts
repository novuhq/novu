import { assertSafeOutboundUrl, SsrfBlockedError } from '@novu/shared/utils/ssrf-url-validation';

const PUSHER_BEAMS_INSTANCE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const PUSHER_BEAMS_HOST_SUFFIX = '.pushnotifications.pusher.com';
const DEFAULT_BLOCKED_PREFIX = 'Pusher Beams instance ID blocked';

export function resolveSafePusherBeamsBaseUrl(instanceId: string, blockedPrefix = DEFAULT_BLOCKED_PREFIX): string {
  if (!PUSHER_BEAMS_INSTANCE_ID_PATTERN.test(instanceId)) {
    throw new Error(`${blockedPrefix}: Invalid instance ID format.`);
  }

  const expectedHostname = `${instanceId}${PUSHER_BEAMS_HOST_SUFFIX}`;
  const baseUrl = `https://${expectedHostname}/publish_api/v1/instances/${encodeURIComponent(instanceId)}`;

  let parsed: URL;

  try {
    parsed = assertSafeOutboundUrl(baseUrl);
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      throw new Error(`${blockedPrefix}: ${err.message}`);
    }
    throw err;
  }

  if (parsed.hostname !== expectedHostname.toLowerCase()) {
    throw new Error(`${blockedPrefix}: Invalid hostname.`);
  }

  return baseUrl;
}
