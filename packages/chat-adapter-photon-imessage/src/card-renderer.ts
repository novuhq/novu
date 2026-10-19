import type { CardElement } from 'chat';

type CardChild = CardElement['children'][number];

/**
 * Escape delimiters that would truncate or nest incorrectly inside `[label](url)`.
 * Backslash itself is escaped first so a trailing `\` cannot neutralize the next escape.
 */
function escapeLinkLabel(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
}

function escapeLinkUrl(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)');
}

function toLink(label: string, url: string): string {
  return `[${escapeLinkLabel(label)}](${escapeLinkUrl(url)})`;
}

function renderChild(child: CardChild): string {
  switch (child.type) {
    case 'text':
      return child.content;
    case 'link':
      return child.url ? toLink(child.label, child.url) : child.label;
    case 'divider':
      return '—';
    case 'section':
      return child.children.map(renderChild).filter(Boolean).join('\n');
    case 'fields':
      return child.children.map((field) => `**${field.label}:** ${field.value}`).join('\n');
    case 'actions':
      return child.children
        .flatMap((action) => {
          if (action.type === 'link-button') {
            return [action.url ? toLink(action.label, action.url) : action.label];
          }

          return [];
        })
        .join('\n');
    case 'image':
      return child.alt ? toLink(child.alt, child.url) : child.url;
    case 'table':
      return [child.headers.join(' | '), ...child.rows.map((row) => row.join(' | '))].join('\n');
    default:
      return '';
  }
}

/**
 * Renders a Chat SDK card into markdown for iMessage via Photon, which renders
 * markdown as native styled text — so links and bold survive instead of
 * degrading to `label (url)` plain text. Interactive buttons have no iMessage
 * equivalent; only link buttons keep their URLs, action buttons are dropped.
 */
export function renderCardAsMarkdown(card: CardElement): string {
  const parts: string[] = [];

  if (card.title) {
    parts.push(`**${card.title}**`);
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
