import { CardElement } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { cardToWhatsAppText } from './card-render.utils';

const markdownCard = (content: string): CardElement => ({
  type: 'card',
  children: [{ type: 'text', content, style: 'plain' }],
});

const richContent = 'a **bold** _italic_ ~~strike~~ `code` [label](https://novu.co)';

describe('cardToWhatsAppText', () => {
  test('uses single-marker bold/strike and renders links as "label (url)"', () => {
    expect(cardToWhatsAppText(markdownCard(richContent))).toBe(
      'a *bold* _italic_ ~strike~ ```code``` label (https://novu.co)'
    );
  });
});
