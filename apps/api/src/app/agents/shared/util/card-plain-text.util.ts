import type { CardElement } from 'chat';

/**
 * Flatten card title + text/link children into a plain-text fallback for durable
 * activity content. Intentionally duplicated from `@novu/chat-adapter-agent-chat`
 * (which needs it for postable-message parsing) so the channel-agnostic
 * egress layer does not depend on a specific channel adapter package.
 */
export function extractCardPlainText(card: CardElement): string {
  const title = typeof card.title === 'string' ? card.title.trim() : '';
  const childText = Array.isArray(card.children)
    ? card.children
        .flatMap((child) => {
          if (!child || typeof child !== 'object') {
            return [];
          }
          const node = child as { type?: string; content?: unknown; label?: unknown; url?: unknown };
          if (node.type === 'text' && typeof node.content === 'string' && node.content.trim()) {
            return [node.content.trim()];
          }
          if (node.type === 'link' && typeof node.label === 'string' && node.label.trim()) {
            const label = node.label.trim();
            const url = typeof node.url === 'string' ? node.url.trim() : '';

            return [url ? `${label} (${url})` : label];
          }

          return [];
        })
        .join('\n')
    : '';

  return childText || title || '[Card]';
}
