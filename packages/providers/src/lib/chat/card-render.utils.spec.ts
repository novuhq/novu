import { CardElement } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { cardToFallbackMarkdown, omitIncompleteLinkButtons } from './card-render.utils';

const baseCard: CardElement = {
  type: 'card',
  title: 'Deploy finished',
  subtitle: 'production',
  imageUrl: 'https://novu.co/hero.png',
  children: [
    { type: 'text', content: 'All checks passed', style: 'bold' },
    { type: 'divider' },
    {
      type: 'actions',
      children: [{ type: 'link-button', label: 'View', url: 'https://novu.co/run/1' }],
    },
  ],
};

describe('cardToFallbackMarkdown', () => {
  test('renders title, subtitle, image and children as markdown', () => {
    expect(cardToFallbackMarkdown(baseCard)).toBe(
      [
        '**Deploy finished**',
        'production',
        '![](https://novu.co/hero.png)',
        '**All checks passed**',
        '---',
        '[View](https://novu.co/run/1)',
      ].join('\n\n')
    );
  });

  test('renders muted text with underscores', () => {
    const card: CardElement = { type: 'card', children: [{ type: 'text', content: 'note', style: 'muted' }] };

    expect(cardToFallbackMarkdown(card)).toBe('_note_');
  });

  test('renders actions without a url as plain labels', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [
            { type: 'link-button', label: 'Draft', url: '' },
            { type: 'link-button', label: 'View', url: 'https://novu.co' },
          ],
        },
      ],
    };

    expect(cardToFallbackMarkdown(card)).toBe('Draft · [View](https://novu.co)');
  });
});

describe('omitIncompleteLinkButtons', () => {
  test('removes link buttons with an empty url and drops empty actions rows', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        { type: 'text', content: 'body', style: 'plain' },
        {
          type: 'actions',
          children: [
            { type: 'link-button', label: 'Draft', url: '' },
            { type: 'link-button', label: 'View', url: 'https://novu.co' },
          ],
        },
        {
          type: 'actions',
          children: [{ type: 'link-button', label: 'Only draft', url: '   ' }],
        },
      ],
    };

    expect(omitIncompleteLinkButtons(card)).toEqual({
      type: 'card',
      children: [
        { type: 'text', content: 'body', style: 'plain' },
        {
          type: 'actions',
          children: [{ type: 'link-button', label: 'View', url: 'https://novu.co' }],
        },
      ],
    });
  });
});
