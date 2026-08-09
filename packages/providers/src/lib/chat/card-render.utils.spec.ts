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
    { type: 'link', label: 'Release notes', url: 'https://novu.co/notes' },
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
        '[Release notes](https://novu.co/notes)',
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

  test('escapes markdown link delimiters in labels and urls', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        { type: 'link', label: 'see [docs]', url: 'https://novu.co/path(with)parens' },
        {
          type: 'actions',
          children: [{ type: 'link-button', label: 'open]now', url: 'https://novu.co/a)b' }],
        },
        { type: 'image', alt: 'shot]', url: 'https://novu.co/img(1).png' },
      ],
    };

    expect(cardToFallbackMarkdown(card)).toBe(
      [
        '[see [docs\\]](https://novu.co/path(with\\)parens)',
        '[open\\]now](https://novu.co/a\\)b)',
        '![shot\\]](https://novu.co/img(1\\).png)',
      ].join('\n\n')
    );
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

  test('keeps interactive button/select children while dropping empty link-buttons', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [
            { type: 'link-button', label: 'Draft', url: '' },
            { type: 'button', id: 'approve', label: 'Approve' },
            {
              type: 'select',
              id: 'env',
              label: 'Env',
              options: [{ label: 'Prod', value: 'prod' }],
            },
          ],
        },
      ],
    };

    expect(omitIncompleteLinkButtons(card)).toEqual({
      type: 'card',
      children: [
        {
          type: 'actions',
          children: [
            { type: 'button', id: 'approve', label: 'Approve' },
            {
              type: 'select',
              id: 'env',
              label: 'Env',
              options: [{ label: 'Prod', value: 'prod' }],
            },
          ],
        },
      ],
    });
  });
});

describe('cardToFallbackMarkdown Chat SDK kit', () => {
  test('renders section, fields, table and interactive action labels', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'section',
          children: [
            { type: 'text', content: 'Details', style: 'bold' },
            {
              type: 'fields',
              children: [{ type: 'field', label: 'Env', value: 'prod' }],
            },
          ],
        },
        {
          type: 'table',
          headers: ['Name', 'Status'],
          rows: [['api', 'ok']],
        },
        {
          type: 'actions',
          children: [
            { type: 'button', id: 'approve', label: 'Approve' },
            { type: 'link-button', label: 'Docs', url: 'https://novu.co' },
          ],
        },
      ],
    };

    expect(cardToFallbackMarkdown(card)).toBe(
      ['**Details**\n\n**Env:** prod', 'Name | Status\napi | ok', 'Approve · [Docs](https://novu.co)'].join('\n\n')
    );
  });
});
