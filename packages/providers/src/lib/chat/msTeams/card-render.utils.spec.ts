import { CardElement } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { toTeamsFlavoredCard, validateTeamsCard } from './card-render.utils';

const markdownCard = (content: string): CardElement => ({
  type: 'card',
  children: [{ type: 'text', content, style: 'plain' }],
});

const richContent = 'a **bold** _italic_ ~~strike~~ `code` [label](https://novu.co)';

describe('toTeamsFlavoredCard', () => {
  test('keeps bold/italic/links but strips strikethrough and inline code', () => {
    const [text] = toTeamsFlavoredCard(markdownCard(richContent)).children;

    expect(text).toEqual({
      type: 'text',
      content: 'a **bold** _italic_ strike code [label](https://novu.co)',
      style: 'plain',
    });
  });
});

describe('validateTeamsCard', () => {
  test('warns when an actions row exceeds the Teams button limit (6)', () => {
    const card: CardElement = {
      type: 'card',
      children: [
        {
          type: 'actions',
          children: Array.from({ length: 7 }, (_, index) => ({
            type: 'link-button' as const,
            label: `b${index}`,
            url: `https://novu.co/${index}`,
          })),
        },
      ],
    };

    expect(validateTeamsCard(card).map((warning) => warning.code)).toContain('BUTTON_LIMIT_EXCEEDED');
  });
});
