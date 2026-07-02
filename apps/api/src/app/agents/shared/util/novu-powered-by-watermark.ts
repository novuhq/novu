import type { CardElement } from 'chat';
import { supportsMarkdownLinks } from '../enums/agent-platform.enum';
import { buildAttributedNovuUrl } from './novu-attribution-url';

export const NOVU_AGENT_POWERED_URL = 'https://go.novu.co/agent-powered';

export const NOVU_AGENT_POWERED_WATERMARK_TEXT = 'Powered by Novu';

const NOVU_POWERED_WATERMARK_MARKER = '\u200B';

const ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `Powered by [Novu](${NOVU_AGENT_POWERED_URL}`;

const LEGACY_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `[${NOVU_AGENT_POWERED_WATERMARK_TEXT}](${NOVU_AGENT_POWERED_URL}`;

export function buildPoweredByWatermark(agentIdentifier: string, platform: string): string {
  if (!supportsMarkdownLinks(platform)) {
    return `${NOVU_AGENT_POWERED_WATERMARK_TEXT}${NOVU_POWERED_WATERMARK_MARKER}`;
  }

  return `Powered by [Novu](${buildAttributedNovuUrl(NOVU_AGENT_POWERED_URL, 'agent-powered', agentIdentifier, platform)})`;
}

export function buildBrandedMarkdownReply(
  markdown: string,
  agentIdentifier: string,
  platform: string
): CardElement {
  const watermark = buildPoweredByWatermark(agentIdentifier, platform);

  return {
    type: 'card',
    children: [
      { type: 'text', content: markdown },
      { type: 'text', content: watermark, style: 'muted' },
    ],
  };
}

export function contentHasPoweredByWatermark(markdown: string): boolean {
  if (
    markdown.includes(ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX) ||
    markdown.includes(LEGACY_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX)
  ) {
    return true;
  }

  const linklessWatermark = `${NOVU_AGENT_POWERED_WATERMARK_TEXT}${NOVU_POWERED_WATERMARK_MARKER}`;
  const trimmed = markdown.trimEnd();

  return trimmed === linklessWatermark || trimmed.endsWith(`\n\n${linklessWatermark}`);
}
