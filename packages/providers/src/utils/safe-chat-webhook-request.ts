import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';

const DEFAULT_BLOCKED_PREFIX = 'Chat webhook URL blocked';

export function resolveSafeChatWebhookUrl(rawUrl: string, blockedPrefix = DEFAULT_BLOCKED_PREFIX): string {
  const url = normalizeOutboundHttpUrl(rawUrl);

  if (!url) {
    throw new Error(`${blockedPrefix}: Invalid URL format.`);
  }

  try {
    assertSafeOutboundUrl(url);
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      throw new Error(`${blockedPrefix}: ${err.message}`);
    }
    throw err;
  }

  return url;
}

export async function safeChatWebhookJsonRequest<T = unknown>(options: {
  url: string;
  method?: 'POST';
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  blockedPrefix?: string;
}) {
  const blockedPrefix = options.blockedPrefix ?? DEFAULT_BLOCKED_PREFIX;
  const safeUrl = resolveSafeChatWebhookUrl(options.url, blockedPrefix);

  const response = await safeOutboundJsonRequest<T>({
    url: safeUrl,
    method: options.method ?? 'POST',
    headers: options.headers,
    body: options.body,
  }).catch((err: unknown) => {
    if (err instanceof SsrfBlockedError) {
      throw new Error(`${blockedPrefix}: ${err.message}`);
    }
    throw err;
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`${blockedPrefix}: Request failed with status ${response.statusCode}`);
  }

  return response;
}
