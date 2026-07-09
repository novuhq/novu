import { ChatCard } from '@novu/stateless';

type AdaptiveCardElement = Record<string, unknown>;

export const ADAPTIVE_CARD_CONTENT_TYPE = 'application/vnd.microsoft.card.adaptive';

/**
 * Serializes the cross-platform ChatCard into an Adaptive Card (v1.5).
 * TextBlocks keep markdown as-is — Adaptive Cards support the same subset
 * (bold, italic, links, lists). Dividers become a `separator` on the next element;
 * link buttons become inline ActionSets with Action.OpenUrl.
 */
export function chatCardToAdaptiveCard(card: ChatCard): Record<string, unknown> {
  const body: AdaptiveCardElement[] = [];
  let pendingSeparator = false;

  const pushElement = (element: AdaptiveCardElement) => {
    body.push(pendingSeparator ? { ...element, separator: true } : element);
    pendingSeparator = false;
  };

  if (card.title) {
    pushElement({ type: 'TextBlock', text: card.title, size: 'Large', weight: 'Bolder', wrap: true });
  }

  if (card.subtitle) {
    pushElement({ type: 'TextBlock', text: card.subtitle, isSubtle: true, wrap: true });
  }

  if (card.imageUrl) {
    pushElement({ type: 'Image', url: card.imageUrl });
  }

  for (const child of card.children) {
    switch (child.type) {
      case 'text':
        pushElement({ type: 'TextBlock', text: child.content, wrap: true });
        break;
      case 'image':
        pushElement({ type: 'Image', url: child.url, ...(child.alt && { altText: child.alt }) });
        break;
      case 'divider':
        pendingSeparator = true;
        break;
      case 'actions':
        pushElement({
          type: 'ActionSet',
          actions: child.children.map((button) => ({
            type: 'Action.OpenUrl',
            title: button.label,
            url: button.url,
          })),
        });
        break;
      default:
        break;
    }
  }

  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body,
  };
}

/** Wraps an Adaptive Card in the message/activity attachment envelope. */
export function adaptiveCardAttachment(card: ChatCard): Record<string, unknown> {
  return {
    contentType: ADAPTIVE_CARD_CONTENT_TYPE,
    contentUrl: null,
    content: chatCardToAdaptiveCard(card),
  };
}
