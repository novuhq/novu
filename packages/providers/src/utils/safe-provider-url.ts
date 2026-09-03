import { isOutboundSsrfProtectionEnabled } from '@novu/shared';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';

interface ResolveSafeProviderUrlOptions {
  allowedHostnames?: string[];
  blockedPrefix: string;
  isHostnameAllowed?: (hostname: string) => boolean;
  requireHttps?: boolean;
}

export class ProviderUrlBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUrlBlockedError';
  }
}

export function resolveSafeProviderUrl(rawUrl: string | undefined, options: ResolveSafeProviderUrlOptions): string {
  if (!isOutboundSsrfProtectionEnabled()) {
    return rawUrl ?? '';
  }

  const normalizedUrl = normalizeOutboundHttpUrl(rawUrl ?? '');

  if (!normalizedUrl) {
    throw new ProviderUrlBlockedError(`${options.blockedPrefix}: Invalid URL format.`);
  }

  let parsed: URL;

  try {
    parsed = assertSafeOutboundUrl(normalizedUrl);
  } catch (error) {
    if (error instanceof SsrfBlockedError) {
      throw new ProviderUrlBlockedError(`${options.blockedPrefix}: ${error.message}`);
    }

    throw error;
  }

  if (options.requireHttps && parsed.protocol !== 'https:') {
    throw new ProviderUrlBlockedError(`${options.blockedPrefix}: Only HTTPS URLs are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isExactHostnameAllowed = options.allowedHostnames?.includes(hostname) ?? true;
  const isCustomHostnameAllowed = options.isHostnameAllowed?.(hostname) ?? true;

  if (!isExactHostnameAllowed || !isCustomHostnameAllowed) {
    throw new ProviderUrlBlockedError(`${options.blockedPrefix}: Hostname is not an allowed provider endpoint.`);
  }

  return normalizedUrl;
}
