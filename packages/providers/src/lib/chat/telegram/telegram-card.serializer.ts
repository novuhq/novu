import { ChatCard } from '@novu/stateless';

/*
 * Telegram limits: 4096 chars per message text, 8 buttons per inline keyboard row.
 */
const MAX_TEXT_LENGTH = 4096;
const MAX_BUTTONS_PER_ROW = 8;

type InlineKeyboardButton = { text: string; url: string };

export type TelegramCardMessage = {
  text: string;
  parse_mode: 'HTML';
  reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
};

/**
 * Serializes the cross-platform ChatCard for the Telegram bot API.
 * Uses HTML parse mode (more robust than MarkdownV2's aggressive escaping rules);
 * link buttons become an inline url keyboard; images degrade to links (sendMessage
 * cannot embed them inline).
 */
export function chatCardToTelegramMessage(card: ChatCard): TelegramCardMessage {
  const lines: string[] = [];
  const keyboardRows: InlineKeyboardButton[][] = [];

  if (card.title) {
    lines.push(`<b>${escapeHtml(card.title)}</b>`);
  }

  if (card.subtitle) {
    lines.push(escapeHtml(card.subtitle));
  }

  if (card.imageUrl) {
    lines.push(`<a href="${escapeHtml(card.imageUrl)}">${escapeHtml(card.imageUrl)}</a>`);
  }

  for (const child of card.children) {
    switch (child.type) {
      case 'text':
        lines.push(markdownToTelegramHtml(child.content));
        break;
      case 'image':
        lines.push(`<a href="${escapeHtml(child.url)}">${escapeHtml(child.alt || child.url)}</a>`);
        break;
      case 'divider':
        lines.push('———');
        break;
      case 'actions':
        for (let i = 0; i < child.children.length; i += MAX_BUTTONS_PER_ROW) {
          keyboardRows.push(
            child.children.slice(i, i + MAX_BUTTONS_PER_ROW).map((button) => ({ text: button.label, url: button.url }))
          );
        }
        break;
      default:
        break;
    }
  }

  const text = lines.join('\n\n');

  return {
    text: text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text,
    parse_mode: 'HTML',
    ...(keyboardRows.length > 0 && { reply_markup: { inline_keyboard: keyboardRows } }),
  };
}

/** Converts the card's markdown flavor into Telegram-supported HTML. */
export function markdownToTelegramHtml(markdown: string): string {
  return escapeHtml(markdown)
    .replace(/```\n?([\s\S]*?)\n?```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
