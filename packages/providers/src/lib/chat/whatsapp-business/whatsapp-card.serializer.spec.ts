import { ChatCard } from '@novu/stateless';
import { expect, test } from 'vitest';
import { chatCardToWhatsAppPayload, markdownToWhatsApp } from './whatsapp-card.serializer';

test('should serialize a card with one button to a cta_url interactive message', () => {
  const card: ChatCard = {
    type: 'card',
    title: 'Order shipped',
    imageUrl: 'https://example.com/header.png',
    children: [
      { type: 'text', content: 'Your order is **on its way**' },
      {
        type: 'actions',
        children: [{ type: 'link-button', label: 'Track', url: 'https://example.com/track' }],
      },
    ],
  };

  expect(chatCardToWhatsAppPayload(card)).toEqual({
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      header: { type: 'image', image: { link: 'https://example.com/header.png' } },
      body: { text: '*Order shipped*\n\nYour order is *on its way*' },
      action: { name: 'cta_url', parameters: { display_text: 'Track', url: 'https://example.com/track' } },
    },
  });
});

test('should degrade extra buttons beyond the single cta_url to text lines', () => {
  const card: ChatCard = {
    type: 'card',
    children: [
      {
        type: 'actions',
        children: [
          { type: 'link-button', label: 'One', url: 'https://example.com/1' },
          { type: 'link-button', label: 'Two', url: 'https://example.com/2' },
          { type: 'link-button', label: 'Three', url: 'https://example.com/3' },
        ],
      },
    ],
  };

  const payload = chatCardToWhatsAppPayload(card);
  if (payload.type !== 'interactive') throw new Error('expected interactive payload');

  expect(payload.interactive.action.parameters).toEqual({ display_text: 'One', url: 'https://example.com/1' });
  expect(payload.interactive.body.text).toBe('Two: https://example.com/2\n\nThree: https://example.com/3');
});

test('should fall back to a text message without buttons', () => {
  const card: ChatCard = {
    type: 'card',
    children: [{ type: 'text', content: 'Plain **info**' }, { type: 'divider' }],
  };

  expect(chatCardToWhatsAppPayload(card)).toEqual({
    type: 'text',
    text: { body: 'Plain *info*\n\n———', preview_url: false },
  });
});

test('should clamp interactive body to 1024 characters', () => {
  const card: ChatCard = {
    type: 'card',
    children: [
      { type: 'text', content: 'a'.repeat(2000) },
      { type: 'actions', children: [{ type: 'link-button', label: 'Go', url: 'https://example.com' }] },
    ],
  };

  const payload = chatCardToWhatsAppPayload(card);
  if (payload.type !== 'interactive') throw new Error('expected interactive payload');

  expect(payload.interactive.body.text.length).toBe(1024);
});

test('markdownToWhatsApp should convert markdown to WhatsApp formatting', () => {
  expect(markdownToWhatsApp('**bold** *italic* ~~strike~~ [x](https://x.co)')).toBe(
    '*bold* _italic_ ~strike~ x: https://x.co'
  );
});
