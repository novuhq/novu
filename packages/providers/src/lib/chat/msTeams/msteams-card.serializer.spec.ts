import { ChatCard } from '@novu/stateless';
import { expect, test } from 'vitest';
import { adaptiveCardAttachment, chatCardToAdaptiveCard } from './msteams-card.serializer';

const card: ChatCard = {
  type: 'card',
  title: 'Deployment finished',
  subtitle: 'production',
  children: [
    { type: 'text', content: 'Version **1.2.3** is live' },
    { type: 'divider' },
    { type: 'text', content: 'below the divider' },
    { type: 'image', url: 'https://example.com/img.png', alt: 'Graph' },
    {
      type: 'actions',
      children: [{ type: 'link-button', label: 'View', url: 'https://example.com/view' }],
    },
  ],
};

test('should serialize a card to an Adaptive Card 1.5', () => {
  expect(chatCardToAdaptiveCard(card)).toEqual({
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      { type: 'TextBlock', text: 'Deployment finished', size: 'Large', weight: 'Bolder', wrap: true },
      { type: 'TextBlock', text: 'production', isSubtle: true, wrap: true },
      { type: 'TextBlock', text: 'Version **1.2.3** is live', wrap: true },
      // divider becomes a separator on the next element
      { type: 'TextBlock', text: 'below the divider', wrap: true, separator: true },
      { type: 'Image', url: 'https://example.com/img.png', altText: 'Graph' },
      {
        type: 'ActionSet',
        actions: [{ type: 'Action.OpenUrl', title: 'View', url: 'https://example.com/view' }],
      },
    ],
  });
});

test('should wrap the adaptive card in the attachments envelope', () => {
  const attachment = adaptiveCardAttachment(card);

  expect(attachment.contentType).toBe('application/vnd.microsoft.card.adaptive');
  expect(attachment.contentUrl).toBeNull();
  expect((attachment.content as { type: string }).type).toBe('AdaptiveCard');
});
