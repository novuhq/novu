import type { CardElement } from 'chat';
import { AgentPlatformEnum, supportsMarkdownLinks } from '../enums/agent-platform.enum';
import { buildAttributedNovuUrl } from './novu-attribution-url';

export const NOVU_AGENT_POWERED_URL = 'https://go.novu.co/agent-powered';

export const NOVU_AGENT_POWERED_WATERMARK_TEXT = 'Powered by Novu';

const NOVU_POWERED_WATERMARK_MARKER = '\u200B';

const ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `Powered by [Novu](${NOVU_AGENT_POWERED_URL}`;

const SLACK_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `Powered by <${NOVU_AGENT_POWERED_URL}`;

const LEGACY_ATTRIBUTED_POWERED_BY_WATERMARK_PREFIX = `[${NOVU_AGENT_POWERED_WATERMARK_TEXT}](${NOVU_AGENT_POWERED_URL}`;

function formatPoweredByLink(label: string, url: string, platform: string): string {
  if (platform === AgentPlatformEnum.SLACK) {
    return `<${url}|${label}>`;
  }

  return `[${label}](${url})`;
}

export function buildPoweredByWatermark(agentIdentifier: string, platform: string): string {
  if (!supportsMarkdownLinks(platform)) {
    return `${NOVU_AGENT_POWERED_WATERMARK_TEXT}${NOVU_POWERED_WATERMARK_MARKER}`;
  }

  const url = buildAttributedNovuUrl(NOVU_AGENT_POWERED_URL, 'agent-powered', agentIdentifier, platform);

  return `Powered by ${formatPoweredByLink('Novu', url, platform)}`;
}

export function buildBrandedMarkdownReply(markdown: string, agentIdentifier: string, platform: string): CardElement {
  const watermark = buildPoweredByWatermark(agentIdentifier, platform);

  return {
    type: 'card',
    children: [
      { type: 'text', content: markdown },
      { type: 'text', content: watermark, style: 'muted' },
    ],
  };
}

export function appendPoweredByWatermarkToMarkdown(
  markdown: string,
  agentIdentifier: string,
  platform: string
): string {
  if (contentHasPoweredByWatermark(markdown)) {
    return markdown;
  }

  return `${markdown.trimEnd()}\n\n${buildPoweredByWatermark(agentIdentifier, platform)}`;
}

type BrandableMarkdownReply = {
  markdown?: string;
  card?: CardElement;
};

export function brandOutboundMarkdownReply<T extends BrandableMarkdownReply>(
  content: T,
  branding: { removeNovuBranding: boolean; agentIdentifier: string; platform: string }
): T {
  if (content.card || !content.markdown || contentHasPoweredByWatermark(content.markdown)) {
    return content;
  }

  if (branding.removeNovuBranding) {
    return content;
  }

  if (branding.platform === AgentPlatformEnum.EMAIL) {
    return {
      ...content,
      markdown: appendPoweredByWatermarkToMarkdown(content.markdown, branding.agentIdentifier, branding.platform),
    };
  }

  const card = buildBrandedMarkdownReply(content.markdown, branding.agentIdentifier, branding.platform);

  return { ...content, card, markdown: undefined };
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
