import { ChatCard } from '@novu/stateless';
import { expect, test } from 'vitest';
import { chatCardToTelegramMessage, markdownToTelegramHtml } from './telegram-card.serializer';

test('should serialize a card to a Telegram HTML message with inline url keyboard', () => {
  const card: ChatCard = {
    type: 'card',
    title: 'Alert',
    children: [
      { type: 'text', content: 'CPU is **high** on <server-1>' },
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          { type: 'link-button', label: 'Dashboard', url: 'https://example.com/dash' },
          { type: 'link-button', label: 'Silence', url: 'https://example.com/silence' },
        ],
      },
    ],
  };

  expect(chatCardToTelegramMessage(card)).toEqual({
    text: '<b>Alert</b>\n\nCPU is <b>high</b> on &lt;server-1&gt;\n\n———',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Dashboard', url: 'https://example.com/dash' },
          { text: 'Silence', url: 'https://example.com/silence' },
        ],
      ],
    },
  });
});

test('should chunk more than 8 buttons into multiple keyboard rows', () => {
  const card: ChatCard = {
    type: 'card',
    children: [
      {
        type: 'actions',
        children: Array.from({ length: 10 }, (_, i) => ({
          type: 'link-button' as const,
          label: `b${i}`,
          url: `https://example.com/${i}`,
        })),
      },
    ],
  };

  const { reply_markup: replyMarkup } = chatCardToTelegramMessage(card);
  expect(replyMarkup?.inline_keyboard).toHaveLength(2);
  expect(replyMarkup?.inline_keyboard[0]).toHaveLength(8);
  expect(replyMarkup?.inline_keyboard[1]).toHaveLength(2);
});

test('should clamp text to 4096 characters', () => {
  const card: ChatCard = {
    type: 'card',
    children: [{ type: 'text', content: 'a'.repeat(5000) }],
  };

  expect(chatCardToTelegramMessage(card).text.length).toBe(4096);
});

test('markdownToTelegramHtml should escape html and convert markdown', () => {
  expect(markdownToTelegramHtml('**bold** [link](https://x.co) `code` a<b')).toBe(
    '<b>bold</b> <a href="https://x.co">link</a> <code>code</code> a&lt;b'
  );
});
