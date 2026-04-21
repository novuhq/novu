import { compileCardToDiscordEmbeds } from './discord-compiler';
import type { CardElementLike } from '../types';

describe('compileCardToDiscordEmbeds', () => {
  it('maps title + text + link-button actions to an embed', () => {
    const card: CardElementLike = {
      type: 'card',
      title: 'Order ready',
      imageUrl: 'https://example.com/banner.png',
      children: [
        { type: 'text', content: 'Your order is ready to ship.' },
        {
          type: 'actions',
          children: [{ type: 'link-button', label: 'Track', url: 'https://example.com/track' }],
        },
      ],
    };

    const [embed] = (compileCardToDiscordEmbeds(card) ?? []) as Array<Record<string, unknown>>;

    expect(embed.title).toBe('Order ready');
    expect((embed.image as { url: string }).url).toBe('https://example.com/banner.png');
    expect(embed.description).toContain('Your order is ready to ship.');
    expect(embed.description).toContain('[Track](https://example.com/track)');
  });

  it('collects fields into embed.fields', () => {
    const card: CardElementLike = {
      type: 'card',
      children: [
        {
          type: 'fields',
          children: [
            { type: 'field', label: 'Status', value: 'Confirmed' },
            { type: 'field', label: 'Total', value: '$99' },
          ],
        },
      ],
    };

    const [embed] = (compileCardToDiscordEmbeds(card) ?? []) as Array<Record<string, unknown>>;
    expect(embed.fields).toEqual([
      { name: 'Status', value: 'Confirmed' },
      { name: 'Total', value: '$99' },
    ]);
  });

  it('walks nested sections for text content', () => {
    const card: CardElementLike = {
      type: 'card',
      children: [
        {
          type: 'section',
          children: [{ type: 'text', content: 'Nested text' }],
        },
      ],
    };

    const [embed] = (compileCardToDiscordEmbeds(card) ?? []) as Array<Record<string, unknown>>;
    expect(embed.description).toContain('Nested text');
  });
});
