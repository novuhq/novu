import { CardElement, CardElementChild } from '@novu/stateless';
import { convertText, escapeHtml, escapeHtmlAttribute, InlineNode } from '../card-render.utils';

/** Telegram `parse_mode: HTML`: `<b>`, `<i>`, `<s>`, `<code>`, `<a href>`, with entity escaping. */
function inlineToTelegramHtml(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value);
        case 'code':
          return `<code>${escapeHtml(node.value)}</code>`;
        case 'bold':
          return `<b>${inlineToTelegramHtml(node.children)}</b>`;
        case 'italic':
          return `<i>${inlineToTelegramHtml(node.children)}</i>`;
        case 'strike':
          return `<s>${inlineToTelegramHtml(node.children)}</s>`;
        case 'link': {
          const label = inlineToTelegramHtml(node.children);

          if (!node.url) {
            return label;
          }

          return `<a href="${escapeHtmlAttribute(node.url)}">${label || escapeHtml(node.url)}</a>`;
        }
        default: {
          const exhaustiveCheck: never = node;

          return exhaustiveCheck;
        }
      }
    })
    .join('');
}

/** Telegram has no native card payload: degrade the card to an HTML string (`parse_mode: HTML`). */
export function cardToTelegramHtml(card: CardElement): string {
  const sections: string[] = [];

  if (card.title) {
    sections.push(`<b>${convertText(card.title, inlineToTelegramHtml)}</b>`);
  }

  if (card.subtitle) {
    sections.push(convertText(card.subtitle, inlineToTelegramHtml));
  }

  if (card.imageUrl) {
    sections.push(`<a href="${escapeHtmlAttribute(card.imageUrl)}">${escapeHtml(card.imageUrl)}</a>`);
  }

  for (const child of card.children) {
    const rendered = telegramChildToHtml(child);

    if (rendered) {
      sections.push(rendered);
    }
  }

  return sections.join('\n\n');
}

function telegramChildToHtml(child: CardElementChild): string {
  switch (child.type) {
    case 'text': {
      const rendered = convertText(child.content, inlineToTelegramHtml);

      if (child.style === 'bold') {
        return `<b>${rendered}</b>`;
      }

      if (child.style === 'muted') {
        return `<i>${rendered}</i>`;
      }

      return rendered;
    }
    case 'image':
      return `<a href="${escapeHtmlAttribute(child.url)}">${child.alt ? escapeHtml(child.alt) : escapeHtml(child.url)}</a>`;
    case 'divider':
      return '———';
    case 'actions':
      return child.children
        .map((button) =>
          button.url
            ? `<a href="${escapeHtmlAttribute(button.url)}">${escapeHtml(button.label)}</a>`
            : escapeHtml(button.label)
        )
        .join('\n');
    default: {
      const exhaustiveCheck: never = child;

      return exhaustiveCheck;
    }
  }
}
