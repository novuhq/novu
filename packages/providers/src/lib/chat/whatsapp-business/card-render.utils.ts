import { CardElement, CardElementChild } from '@novu/stateless';
import { convertText, InlineNode } from '../card-render.utils';

/** WhatsApp: `*bold*`, `_italic_`, `~strike~`, ```` ```mono``` ````; no link markup, so render `label (url)`. */
function inlineToWhatsApp(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'code':
          return `\`\`\`${node.value}\`\`\``;
        case 'bold':
          return `*${inlineToWhatsApp(node.children)}*`;
        case 'italic':
          return `_${inlineToWhatsApp(node.children)}_`;
        case 'strike':
          return `~${inlineToWhatsApp(node.children)}~`;
        case 'link': {
          const label = inlineToWhatsApp(node.children);

          if (!node.url) {
            return label;
          }

          return label && label !== node.url ? `${label} (${node.url})` : node.url;
        }
        default: {
          const exhaustiveCheck: never = node;

          return exhaustiveCheck;
        }
      }
    })
    .join('');
}

/** WhatsApp has no native card payload: degrade the card to WhatsApp-flavored plain text. */
export function cardToWhatsAppText(card: CardElement): string {
  const sections: string[] = [];

  if (card.title) {
    sections.push(`*${convertText(card.title, inlineToWhatsApp)}*`);
  }

  if (card.subtitle) {
    sections.push(convertText(card.subtitle, inlineToWhatsApp));
  }

  if (card.imageUrl) {
    sections.push(card.imageUrl);
  }

  for (const child of card.children) {
    const rendered = whatsAppChildToText(child);

    if (rendered) {
      sections.push(rendered);
    }
  }

  return sections.join('\n\n');
}

function whatsAppChildToText(child: CardElementChild): string {
  switch (child.type) {
    case 'text': {
      const rendered = convertText(child.content, inlineToWhatsApp);

      if (child.style === 'bold') {
        return `*${rendered}*`;
      }

      if (child.style === 'muted') {
        return `_${rendered}_`;
      }

      return rendered;
    }
    case 'image':
      return child.url;
    case 'divider':
      return '———';
    case 'actions':
      return child.children.map((button) => (button.url ? `${button.label} (${button.url})` : button.label)).join('\n');
    default: {
      const exhaustiveCheck: never = child;

      return exhaustiveCheck;
    }
  }
}
