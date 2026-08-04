import type { CardElement } from 'chat';

/**
 * Flatten card title + text children into a plain-text fallback for durable
 * activity content. Intentionally duplicated from `@novu/chat-adapter-web`
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
          const node = child as { type?: string; content?: unknown };
          if (node.type === 'text' && typeof node.content === 'string' && node.content.trim()) {
            return [node.content.trim()];
          }

          return [];
        })
        .join('\n')
    : '';

  return childText || title || '[Card]';
}
