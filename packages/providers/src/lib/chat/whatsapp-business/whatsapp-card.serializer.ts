import { ChatCard } from '@novu/stateless';

/*
 * WhatsApp limits: interactive body max 1024 chars, text body max 4096 chars.
 * cta_url interactive messages support exactly ONE url button; reply buttons
 * (max 3) cannot carry URLs, so extra link buttons degrade to text lines.
 */
const MAX_INTERACTIVE_BODY = 1024;
const MAX_TEXT_BODY = 4096;

export type WhatsAppCardPayload =
  | { type: 'text'; text: { body: string; preview_url: boolean } }
  | {
      type: 'interactive';
      interactive: {
        type: 'cta_url';
        header?: { type: 'image'; image: { link: string } };
        body: { text: string };
        action: { name: 'cta_url'; parameters: { display_text: string; url: string } };
      };
    };

/**
 * Serializes the cross-platform ChatCard for the WhatsApp Business Cloud API.
 * The first link button becomes a cta_url interactive message; remaining buttons
 * (and dividers/images beyond the header) degrade into the body text.
 */
export function chatCardToWhatsAppPayload(card: ChatCard): WhatsAppCardPayload {
  const lines: string[] = [];
  const buttons: Array<{ label: string; url: string }> = [];
  let headerImage: string | undefined = card.imageUrl;

  if (card.title) {
    lines.push(`*${card.title}*`);
  }

  if (card.subtitle) {
    lines.push(card.subtitle);
  }

  for (const child of card.children) {
    switch (child.type) {
      case 'text':
        lines.push(markdownToWhatsApp(child.content));
        break;
      case 'image':
        if (!headerImage) {
          headerImage = child.url;
        } else {
          lines.push(child.url);
        }
        break;
      case 'divider':
        lines.push('———');
        break;
      case 'actions':
        buttons.push(...child.children.map(({ label, url }) => ({ label, url })));
        break;
      default:
        break;
    }
  }

  const [ctaButton, ...extraButtons] = buttons;

  // Buttons beyond the single supported cta_url degrade to "Label: url" lines
  for (const button of extraButtons) {
    lines.push(`${button.label}: ${button.url}`);
  }

  const body = lines.join('\n\n');

  if (ctaButton) {
    return {
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        ...(headerImage && { header: { type: 'image', image: { link: headerImage } } }),
        body: { text: truncate(body, MAX_INTERACTIVE_BODY) },
        action: { name: 'cta_url', parameters: { display_text: ctaButton.label, url: ctaButton.url } },
      },
    };
  }

  // Text messages have no image header, so surface the image as a URL line
  const textBody = headerImage ? `${body}\n\n${headerImage}` : body;

  return {
    type: 'text',
    text: { body: truncate(textBody, MAX_TEXT_BODY), preview_url: false },
  };
}

/** Converts the card's markdown flavor to WhatsApp formatting (*bold*, _italic_, ~strike~). */
export function markdownToWhatsApp(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, '$1: $2')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1_$2_')
    .replace(/\*\*([^*]+)\*\*/g, '*$1*')
    .replace(/~~([^~]+)~~/g, '~$1~');
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
