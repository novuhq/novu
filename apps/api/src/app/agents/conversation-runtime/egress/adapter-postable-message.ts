import type { AdapterPostableMessage } from 'chat';
import type { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum, supportsPoweredByWatermark } from '../../shared/enums/agent-platform.enum';
import { appendPoweredByWatermark, contentHasPoweredByWatermark } from '../../shared/util/novu-powered-by-watermark';
import { SLACK_MARKDOWN_TEXT_LIMIT, splitOversizedSlackText } from '../../shared/util/slack-section-limits';
import type { ChatSdkReplyContent } from './file-materializer.service';

/** The subset of the resolved config that drives outbound watermarking. */
export type OutboundBrandingContext = Pick<ResolvedAgentConfig, 'removeNovuBranding' | 'agentIdentifier' | 'platform'>;

/**
 * Appends a "Powered by Novu" markdown footer for orgs that have not removed
 * Novu branding. Pro and above can disable it via `removeNovuBranding`.
 * Cards and action messages are left untouched, as are platforms that opt
 * out of the watermark (web chat renders inside the customer's own UI).
 */
function applyOutboundBranding(content: ChatSdkReplyContent, branding: OutboundBrandingContext): ChatSdkReplyContent {
  if (content.card || !content.markdown || contentHasPoweredByWatermark(content.markdown)) {
    return content;
  }

  if (branding.removeNovuBranding || !supportsPoweredByWatermark(branding.platform)) {
    return content;
  }

  return {
    ...content,
    markdown: appendPoweredByWatermark(content.markdown, branding.agentIdentifier, branding.platform),
  };
}

/**
 * Single payload-construction chokepoint for adapter deliveries (post, DM,
 * edit). Branding is applied here so no delivery path can miss the watermark.
 */
export function buildAdapterPostableMessage(
  content: ChatSdkReplyContent,
  branding: OutboundBrandingContext
): AdapterPostableMessage {
  const deliveryContent = applyOutboundBranding(content, branding);

  if (deliveryContent.card) {
    return {
      card:
        branding.platform === AgentPlatformEnum.SLACK
          ? splitOversizedSlackText(deliveryContent.card)
          : deliveryContent.card,
      ...(deliveryContent.files?.length ? { files: deliveryContent.files } : {}),
    } as AdapterPostableMessage;
  }

  const markdown = deliveryContent.markdown ?? '';

  if (branding.platform === AgentPlatformEnum.SLACK && markdown.length > SLACK_MARKDOWN_TEXT_LIMIT) {
    return {
      card: splitOversizedSlackText({
        type: 'card',
        children: [{ type: 'text', content: markdown }],
      }),
      ...(deliveryContent.files?.length ? { files: deliveryContent.files } : {}),
    } as AdapterPostableMessage;
  }

  return {
    markdown,
    files: deliveryContent.files,
  } as AdapterPostableMessage;
}
