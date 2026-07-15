import type { CardChild, CardElement } from 'chat';

function cardChildToFallbackText(child: CardChild): string | null {
  switch (child.type) {
    case 'text':
      return child.content;
    case 'link':
      return `${child.label} (${child.url})`;
    case 'fields':
      return child.children.map((field) => `${field.label}: ${field.value}`).join('\n');
    case 'actions':
      return null;
    case 'section':
      return child.children.map((c) => cardChildToFallbackText(c)).filter(Boolean).join('\n') || null;
    default:
      return null;
  }
}

function cardToFallbackText(card: CardElement): string {
  const parts: string[] = [];

  if (card.title) {
    parts.push(`**${card.title}**`);
  }
  if (card.subtitle) {
    parts.push(card.subtitle);
  }

  for (const child of card.children ?? []) {
    const text = cardChildToFallbackText(child);
    if (text) {
      parts.push(text);
    }
  }

  return parts.join('\n');
}

function collectButtonLabels(children: CardChild[] | undefined, labels: string[]): void {
  if (!children?.length) {
    return;
  }

  for (const child of children) {
    if (child.type === 'actions' && Array.isArray(child.children)) {
      for (const action of child.children) {
        if (action.type === 'button' && typeof action.label === 'string' && action.label.trim()) {
          labels.push(action.label.trim());
        }
      }
    }

    if (child.type === 'section' && Array.isArray(child.children)) {
      collectButtonLabels(child.children, labels);
    }
  }
}

export function deriveCardFallbackText(card: CardElement): string {
  const fromCard = cardToFallbackText(card).trim();
  if (fromCard) {
    return fromCard;
  }

  const buttonLabels: string[] = [];
  collectButtonLabels(card.children, buttonLabels);
  if (buttonLabels.length) {
    return buttonLabels.join('\n');
  }

  if (card.title?.trim()) {
    return card.title.trim();
  }

  if (card.subtitle?.trim()) {
    return card.subtitle.trim();
  }

  return '';
}

/**
 * Some chat adapters (notably Telegram) require non-empty message text even when
 * delivering an interactive card. The upstream chat SDK ignores action buttons
 * when deriving fallback text, so enrich button-only cards before posting.
 */
export function ensureCardDeliverable(card: CardElement): CardElement {
  if (cardToFallbackText(card).trim()) {
    return card;
  }

  const buttonLabels: string[] = [];
  collectButtonLabels(card.children, buttonLabels);
  const fallbackContent = buttonLabels.length ? buttonLabels.join('\n') : 'Interactive message';

  return {
    ...card,
    children: [{ type: 'text', content: fallbackContent }, ...(card.children ?? [])],
  };
}
