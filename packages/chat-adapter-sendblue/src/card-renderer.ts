import type { CardElement } from 'chat';

type CardChild = CardElement['children'][number];

function renderChild(child: CardChild): string {
  switch (child.type) {
    case 'text':
      return child.content;
    case 'link':
      return `${child.label} (${child.url})`;
    case 'divider':
      return '—';
    case 'section':
      return child.children.map(renderChild).filter(Boolean).join('\n');
    case 'fields':
      return child.children.map((field) => `${field.label}: ${field.value}`).join('\n');
    case 'actions':
      return child.children
        .flatMap((action) => {
          if (action.type === 'link-button') {
            return [`${action.label}: ${action.url}`];
          }

          return [];
        })
        .join('\n');
    case 'image':
      return child.alt ? `${child.alt} (${child.url})` : child.url;
    case 'table':
      return [child.headers.join(' | '), ...child.rows.map((row) => row.join(' | '))].join('\n');
    default:
      return '';
  }
}

/**
 * Renders a Chat SDK card into plain text for iMessage/SMS delivery.
 * Interactive buttons cannot work over SMS, so only link buttons keep their
 * URLs; action buttons are dropped.
 */
export function renderCardAsText(card: CardElement): string {
  const parts: string[] = [];

  if (card.title) {
    parts.push(card.title);
  }
  if (card.subtitle) {
    parts.push(card.subtitle);
  }

  for (const child of card.children) {
    const rendered = renderChild(child);
    if (rendered) {
      parts.push(rendered);
    }
  }

  return parts.join('\n\n').trim();
}
