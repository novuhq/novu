import { supportsMarkdownLinks } from '../enums/agent-platform.enum';
import { buildAttributedNovuUrl } from './novu-attribution-url';

export const NOVU_AGENT_POWERED_URL = 'https://go.novu.co/agent-powered';

export const NOVU_AGENT_POWERED_WATERMARK_TEXT = 'Powered by Novu';

const NOVU_POWERED_WATERMARK_MARKER = '\u200B';

const ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `Powered by [Novu](${NOVU_AGENT_POWERED_URL}`;

// Previous Slack card path used mrkdwn (`<url|Novu>`). Keep detecting it so we don't double-stamp.
const SLACK_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `Powered by <${NOVU_AGENT_POWERED_URL}`;

const LEGACY_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `[${NOVU_AGENT_POWERED_WATERMARK_TEXT}](${NOVU_AGENT_POWERED_URL}`;

export function buildPoweredByWatermark(agentIdentifier: string, platform: string): string {
  if (!supportsMarkdownLinks(platform)) {
    return `${NOVU_AGENT_POWERED_WATERMARK_TEXT}${NOVU_POWERED_WATERMARK_MARKER}`;
  }

  const url = buildAttributedNovuUrl(NOVU_AGENT_POWERED_URL, 'agent-powered', agentIdentifier, platform);

  return `_Powered by [Novu](${url})_`;
}

export function appendPoweredByWatermark(markdown: string, agentIdentifier: string, platform: string): string {
  const watermark = buildPoweredByWatermark(agentIdentifier, platform);

  return `${markdown}\n\n${watermark}`;
}

export function contentHasPoweredByWatermark(markdown: string): boolean {
  if (
    markdown.includes(ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX) ||
    markdown.includes(SLACK_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX) ||
    markdown.includes(LEGACY_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX)
  ) {
    return true;
  }

  const linklessWatermark = `${NOVU_AGENT_POWERED_WATERMARK_TEXT}${NOVU_POWERED_WATERMARK_MARKER}`;
  const trimmed = markdown.trimEnd();

  return trimmed === linklessWatermark || trimmed.endsWith(`\n\n${linklessWatermark}`);
}
