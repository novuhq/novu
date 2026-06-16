import { supportsMarkdownLinks } from '../enums/agent-platform.enum';
import { buildAttributedNovuUrl } from './novu-attribution-url';

export const NOVU_AGENT_POWERED_URL = 'https://go.novu.co/agent-powered';

export const NOVU_AGENT_POWERED_WATERMARK_TEXT = 'Powered by Novu';

export function buildPoweredByWatermark(agentIdentifier: string, platform: string): string {
  if (!supportsMarkdownLinks(platform)) {
    return NOVU_AGENT_POWERED_WATERMARK_TEXT;
  }

  return `[Powered by Novu](${buildAttributedNovuUrl(NOVU_AGENT_POWERED_URL, 'agent-powered', agentIdentifier, platform)})`;
}

export function contentHasPoweredByWatermark(markdown: string): boolean {
  if (markdown.includes(NOVU_AGENT_POWERED_URL)) {
    return true;
  }

  return markdown.includes(`\n\n${NOVU_AGENT_POWERED_WATERMARK_TEXT}`);
}
