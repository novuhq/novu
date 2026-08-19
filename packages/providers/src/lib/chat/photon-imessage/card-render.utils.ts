import { CardElement } from '@novu/stateless';

type CardChild = CardElement['children'][number];

/**
 * Rich Chat: iMessage via Photon renders markdown as native styled text
 * (spectrum-ts `markdown()` content), so unlike plain-text chat providers the
 * card keeps real bold, links, and structure. Interactive action buttons have
 * no iMessage equivalent — only link buttons survive, as markdown links.
 */
function renderChild(child: CardChild): string {
  switch (child.type) {
    case 'text':
      return child.content;
    case 'link':
      return `[${child.label}](${child.url})`;
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
            return [`[${action.label}](${action.url})`];
          }

          return [];
        })
        .join('\n');
    case 'image':
      return child.alt ? `[${child.alt}](${child.url})` : child.url;
    case 'table':
      return [child.headers.join(' | '), ...child.rows.map((row) => row.join(' | '))].join('\n');
    default:
      return '';
  }
}

export function cardToPhotonMarkdown(card: CardElement): string {
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
