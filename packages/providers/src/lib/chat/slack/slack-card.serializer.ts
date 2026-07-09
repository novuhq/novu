import { ChatCard, ChatCardLinkButtonElement } from '@novu/stateless';

/*
 * Slack hard limits: 50 blocks per message, 25 elements per actions block,
 * 3000 chars per section text, 150 chars per header text.
 */
const MAX_BLOCKS = 50;
const MAX_ACTION_ELEMENTS = 25;
const MAX_SECTION_TEXT = 3000;
const MAX_HEADER_TEXT = 150;
const MAX_BUTTON_TEXT = 75;

type SlackBlock = Record<string, unknown>;

/**
 * Serializes the cross-platform ChatCard into Slack Block Kit blocks.
 * Explicit `blocks` passed by the caller (bridge overrides) always take
 * precedence over this serialization — enforced at the call sites.
 */
export function chatCardToSlackBlocks(card: ChatCard): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  if (card.title) {
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: truncate(card.title, MAX_HEADER_TEXT), emoji: true },
    });
  }

  if (card.subtitle) {
    blocks.push(sectionBlock(card.subtitle));
  }

  if (card.imageUrl) {
    blocks.push({ type: 'image', image_url: card.imageUrl, alt_text: card.title ?? 'image' });
  }

  for (const child of card.children) {
    switch (child.type) {
      case 'text':
        blocks.push(sectionBlock(child.content));
        break;
      case 'image':
        blocks.push({ type: 'image', image_url: child.url, alt_text: child.alt ?? 'image' });
        break;
      case 'divider':
        blocks.push({ type: 'divider' });
        break;
      case 'actions':
        for (const chunk of chunkArray(child.children, MAX_ACTION_ELEMENTS)) {
          blocks.push({
            type: 'actions',
            elements: chunk.map(buttonElement),
          });
        }
        break;
      default:
        break;
    }
  }

  return blocks.slice(0, MAX_BLOCKS);
}

function sectionBlock(markdown: string): SlackBlock {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text: truncate(markdownToMrkdwn(markdown), MAX_SECTION_TEXT) },
  };
}

function buttonElement(button: ChatCardLinkButtonElement): SlackBlock {
  return {
    type: 'button',
    text: { type: 'plain_text', text: truncate(button.label, MAX_BUTTON_TEXT), emoji: true },
    url: button.url,
    ...(button.style === 'primary' && { style: 'primary' }),
    ...(button.style === 'danger' && { style: 'danger' }),
  };
}

/**
 * Converts standard markdown to Slack mrkdwn: **bold** → *bold*, *italic* → _italic_,
 * ~~strike~~ → ~strike~, [text](url) → <url|text>. Inline code and fences are shared syntax.
 */
export function markdownToMrkdwn(markdown: string): string {
  const withLinks = markdown.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, '<$2|$1>');
  // single-asterisk italics first (a lone * pair, not part of **) so bold pairs stay intact
  const withItalics = withLinks.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1_$2_');
  // bold **text** -> *text*
  const withBold = withItalics.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  return withBold.replace(/~~([^~]+)~~/g, '~$1~');
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}
