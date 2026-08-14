import { BadRequestException } from '@nestjs/common';
import { assertSafeOutboundUrl, resolvePublicAddresses, SsrfBlockedError } from '@novu/application-generic';

/**
 * A context `bridgeUrl` is `fetch()`ed from inside the API process on every inbound agent turn whose
 * resolved connect-time context includes it, carrying a Novu HMAC and a sensitive payload (subscriber
 * PII + conversation history). Without an SSRF guard an authenticated WORKFLOW_WRITE caller could
 * repoint routing at internal hosts (loopback, RFC1918, link-local 169.254.169.254, cloud metadata).
 * Mirrors the agent bridge URL guard in UpdateAgent.
 */
export async function assertSafeContextBridgeUrl(url: string | undefined | null): Promise<void> {
  if (!url) {
    return;
  }

  try {
    const parsed = assertSafeOutboundUrl(url);
    await resolvePublicAddresses(parsed.hostname);
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      throw new BadRequestException(`bridgeUrl: ${err.message}`);
    }
    throw err;
  }
}
