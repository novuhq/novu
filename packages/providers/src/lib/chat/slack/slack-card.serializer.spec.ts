import { ChatCard } from '@novu/stateless';
import { expect, test } from 'vitest';
import { chatCardToSlackBlocks, markdownToMrkdwn } from './slack-card.serializer';

const card: ChatCard = {
  type: 'card',
  title: 'Deployment finished',
  children: [
    { type: 'text', content: 'Version **1.2.3** is live, see [docs](https://docs.novu.co)' },
    { type: 'divider' },
    { type: 'image', url: 'https://example.com/img.png', alt: 'Graph' },
    {
      type: 'actions',
      children: [
        { type: 'link-button', label: 'View', url: 'https://example.com/view', style: 'primary' },
        { type: 'link-button', label: 'Rollback', url: 'https://example.com/rollback', style: 'danger' },
      ],
    },
  ],
};

test('should serialize a card to Slack Block Kit blocks', () => {
  const blocks = chatCardToSlackBlocks(card);

  expect(blocks).toEqual([
    { type: 'header', text: { type: 'plain_text', text: 'Deployment finished', emoji: true } },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'Version *1.2.3* is live, see <https://docs.novu.co|docs>' },
    },
    { type: 'divider' },
    { type: 'image', image_url: 'https://example.com/img.png', alt_text: 'Graph' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View', emoji: true },
          url: 'https://example.com/view',
          style: 'primary',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Rollback', emoji: true },
          url: 'https://example.com/rollback',
          style: 'danger',
        },
      ],
    },
  ]);
});

test('should clamp output to 50 blocks', () => {
  const bigCard: ChatCard = {
    type: 'card',
    children: Array.from({ length: 60 }, (_, i) => ({ type: 'text' as const, content: `line ${i}` })),
  };

  expect(chatCardToSlackBlocks(bigCard)).toHaveLength(50);
});

test('should chunk more than 25 buttons into multiple actions blocks', () => {
  const buttonsCard: ChatCard = {
    type: 'card',
    children: [
      {
        type: 'actions',
        children: Array.from({ length: 30 }, (_, i) => ({
          type: 'link-button' as const,
          label: `b${i}`,
          url: `https://example.com/${i}`,
        })),
      },
    ],
  };

  const blocks = chatCardToSlackBlocks(buttonsCard);
  expect(blocks).toHaveLength(2);
  expect((blocks[0].elements as unknown[]).length).toBe(25);
  expect((blocks[1].elements as unknown[]).length).toBe(5);
});

test('markdownToMrkdwn should convert bold, italic, strike and links', () => {
  expect(markdownToMrkdwn('**bold** and *italic* and ~~gone~~ and [x](https://x.co)')).toBe(
    '*bold* and _italic_ and ~gone~ and <https://x.co|x>'
  );
});
