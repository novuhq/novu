/**
 * Builds a Novu marketing URL with the campaign attribution convention shared
 * by every agent-originated CTA (upgrade buttons, watermarks, …), so a click
 * can be traced back to the originating agent/channel:
 *   - utm_campaign: the campaign constant (e.g. `agent-limits`, `agent-powered`)
 *   - utm_medium:   the delivery medium (defaults to `chat`)
 *   - utm_source:   the agent identifier
 *   - utm_channel:  the delivery platform (slack | telegram | teams | …)
 *
 * IMPORTANT: the URL must contain an EVEN number of underscores. The Telegram
 * adapter (`@chat-adapter/telegram`) counts unescaped `_` in the rendered
 * MarkdownV2 — including inside link URLs — and slices the message at the last
 * "unpaired" one, truncating the message mid-URL when the count is odd. Four
 * `utm_*` params keep the parity even; don't add or remove one without
 * adjusting another (and keep agent identifiers, campaign, medium, and
 * platform values underscore-free).
 */
export function buildAttributedNovuUrl(
  baseUrl: string,
  campaign: string,
  agentIdentifier: string,
  platform: string,
  medium = 'chat'
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_source', agentIdentifier);
  url.searchParams.set('utm_channel', platform);

  return url.toString();
}
